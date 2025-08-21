import { storage } from './storage';
import type { ApprovalHierarchy, ApprovalLevel, InsertApproval } from '@shared/schema';

export interface WorkflowContext {
  entityId: string;
  entityType: 'procurement_request' | 'purchase_order';
  amount?: number;
  department?: string;
  requesterId: string;
}

export interface ApprovalStep {
  levelId: string;
  levelNumber: number;
  name: string;
  requiredRole: string;
  requiredCount: number;
  isParallel: boolean;
  timeoutHours?: number;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  approvers: Array<{
    userId: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedAt?: Date;
    comments?: string;
  }>;
}

export class ApprovalWorkflowEngine {
  /**
   * Determine which approval hierarchy to use for a given context
   */
  async determineApprovalHierarchy(context: WorkflowContext): Promise<ApprovalHierarchy | null> {
    const hierarchies = await storage.getApprovalHierarchies(context.entityType);
    
    // For now, use the default hierarchy for the entity type
    // In future, this could include conditional logic based on amount, department, etc.
    const defaultHierarchy = hierarchies.find(h => h.isDefault && h.isActive);
    if (defaultHierarchy) {
      return defaultHierarchy;
    }

    // If no default, use the first active hierarchy
    const activeHierarchy = hierarchies.find(h => h.isActive);
    return activeHierarchy || null;
  }

  /**
   * Initialize approval workflow for an entity
   */
  async initiateApprovalWorkflow(context: WorkflowContext): Promise<ApprovalStep[]> {
    const hierarchy = await this.determineApprovalHierarchy(context);
    
    if (!hierarchy) {
      throw new Error(`No approval hierarchy found for ${context.entityType}`);
    }

    const levels = await storage.getApprovalLevels(hierarchy.id);
    
    if (levels.length === 0) {
      throw new Error(`No approval levels configured for hierarchy: ${hierarchy.name}`);
    }

    // Create approval steps based on the configured levels
    const approvalSteps: ApprovalStep[] = [];
    
    for (const level of levels.sort((a, b) => a.sortOrder - b.sortOrder)) {
      // Get users with the required role for this level
      const eligibleApprovers = await this.getEligibleApprovers(level, context);
      
      if (eligibleApprovers.length === 0) {
        console.warn(`No eligible approvers found for level ${level.name} with role ${level.requiredRole}`);
        continue;
      }

      // Select approvers based on required count and parallel settings
      const selectedApprovers = this.selectApprovers(eligibleApprovers, level);

      const approvalStep: ApprovalStep = {
        levelId: level.id,
        levelNumber: level.levelNumber,
        name: level.name,
        requiredRole: level.requiredRole,
        requiredCount: level.requiredCount,
        isParallel: level.isParallel,
        timeoutHours: level.timeoutHours,
        status: 'pending',
        approvers: selectedApprovers.map(approverId => ({
          userId: approverId,
          status: 'pending'
        }))
      };

      approvalSteps.push(approvalStep);

      // Create approval records in the database
      for (const approverId of selectedApprovers) {
        const approvalData: InsertApproval = {
          entityType: context.entityType,
          entityId: context.entityId,
          approverId: approverId,
          requiredBy: level.timeoutHours ? new Date(Date.now() + level.timeoutHours * 60 * 60 * 1000) : null,
          levelId: level.id,
          levelNumber: level.levelNumber,
          status: 'pending',
          assignedAt: new Date(),
        };

        await storage.createApproval(approvalData);
      }
    }

    return approvalSteps;
  }

  /**
   * Get eligible approvers for a specific level and context
   */
  private async getEligibleApprovers(level: ApprovalLevel, context: WorkflowContext): Promise<string[]> {
    // Get users with the required role
    const users = await storage.getUsersByRole(level.requiredRole);
    
    // Filter based on context (e.g., same department for dept_approver)
    let eligibleUsers = users;
    
    if (level.requiredRole === 'dept_approver' && context.department) {
      // For department approvers, only include users from the same department
      eligibleUsers = users.filter(user => user.department === context.department);
    }

    // Exclude the requester from approving their own request
    eligibleUsers = eligibleUsers.filter(user => user.id !== context.requesterId);

    return eligibleUsers.map(user => user.id);
  }

  /**
   * Select specific approvers based on level configuration
   */
  private selectApprovers(eligibleApprovers: string[], level: ApprovalLevel): string[] {
    if (level.isParallel) {
      // For parallel approval, select up to requiredCount approvers
      return eligibleApprovers.slice(0, level.requiredCount);
    } else {
      // For sequential approval, select one approver
      // In future, this could be based on workload, availability, etc.
      return eligibleApprovers.slice(0, 1);
    }
  }

  /**
   * Process an approval action
   */
  async processApprovalAction(
    approvalId: string,
    action: 'approve' | 'reject',
    approverId: string,
    comments?: string
  ): Promise<{ nextStep?: ApprovalStep; workflowComplete?: boolean; finalStatus?: 'approved' | 'rejected' }> {
    // Update the approval record
    const approval = await storage.updateApproval(approvalId, {
      status: action === 'approve' ? 'approved' : 'rejected',
      approvedBy: approverId,
      approvedAt: new Date(),
      comments: comments,
    });

    if (!approval) {
      throw new Error('Approval not found');
    }

    // Get all approvals for this entity to check workflow status
    const entityApprovals = await storage.getApprovalsByEntity(approval.entityId, approval.entityType);
    const approvalsByLevel = this.groupApprovalsByLevel(entityApprovals);

    // Check if current level is complete
    const currentLevel = approvalsByLevel[approval.levelNumber!];
    const levelComplete = this.isLevelComplete(currentLevel);

    if (action === 'reject') {
      // If rejected, workflow stops
      return {
        workflowComplete: true,
        finalStatus: 'rejected'
      };
    }

    if (!levelComplete) {
      // Level not complete yet, wait for more approvals
      return {};
    }

    // Current level is complete, check if there's a next level
    const nextLevelNumber = approval.levelNumber! + 1;
    const nextLevel = approvalsByLevel[nextLevelNumber];

    if (!nextLevel || nextLevel.length === 0) {
      // No more levels, workflow is complete
      return {
        workflowComplete: true,
        finalStatus: 'approved'
      };
    }

    // Activate next level
    await this.activateLevel(nextLevel);

    // Return next step info
    const nextStep: ApprovalStep = {
      levelId: nextLevel[0].levelId!,
      levelNumber: nextLevelNumber,
      name: nextLevel[0].levelName || `Level ${nextLevelNumber}`,
      requiredRole: nextLevel[0].requiredRole || '',
      requiredCount: nextLevel.length,
      isParallel: true, // Simplified for now
      status: 'pending',
      approvers: nextLevel.map(approval => ({
        userId: approval.approverId,
        status: 'pending'
      }))
    };

    return { nextStep };
  }

  /**
   * Group approvals by level number
   */
  private groupApprovalsByLevel(approvals: any[]): { [levelNumber: number]: any[] } {
    const grouped: { [levelNumber: number]: any[] } = {};
    
    for (const approval of approvals) {
      const levelNumber = approval.levelNumber || 1;
      if (!grouped[levelNumber]) {
        grouped[levelNumber] = [];
      }
      grouped[levelNumber].push(approval);
    }

    return grouped;
  }

  /**
   * Check if a level is complete based on approval requirements
   */
  private isLevelComplete(levelApprovals: any[]): boolean {
    if (!levelApprovals || levelApprovals.length === 0) {
      return false;
    }

    // Check if all required approvals are completed
    const approvedCount = levelApprovals.filter(a => a.status === 'approved').length;
    const rejectedCount = levelApprovals.filter(a => a.status === 'rejected').length;

    // If any rejection, level is failed
    if (rejectedCount > 0) {
      return true; // Complete but failed
    }

    // For now, require all approvers in a level to approve
    // In future, this could be configurable based on level.requiredCount
    return approvedCount === levelApprovals.length;
  }

  /**
   * Activate pending approvals for a level
   */
  private async activateLevel(levelApprovals: any[]): Promise<void> {
    // In a real system, this might send notifications, update statuses, etc.
    // For now, approvals are created as 'pending' and ready to be acted upon
    console.log(`Activated approval level with ${levelApprovals.length} approvers`);
  }

  /**
   * Get current approval status for an entity
   */
  async getApprovalStatus(entityId: string, entityType: 'procurement_request' | 'purchase_order'): Promise<{
    status: 'pending' | 'approved' | 'rejected';
    currentLevel?: number;
    completedLevels: number[];
    totalLevels: number;
    steps: ApprovalStep[];
  }> {
    const approvals = await storage.getApprovalsByEntity(entityId, entityType);
    
    if (approvals.length === 0) {
      return {
        status: 'pending',
        completedLevels: [],
        totalLevels: 0,
        steps: []
      };
    }

    const approvalsByLevel = this.groupApprovalsByLevel(approvals);
    const levelNumbers = Object.keys(approvalsByLevel).map(Number).sort((a, b) => a - b);
    
    const steps: ApprovalStep[] = [];
    const completedLevels: number[] = [];
    let currentLevel: number | undefined;
    let overallStatus: 'pending' | 'approved' | 'rejected' = 'pending';

    for (const levelNumber of levelNumbers) {
      const levelApprovals = approvalsByLevel[levelNumber];
      const isComplete = this.isLevelComplete(levelApprovals);
      const hasRejection = levelApprovals.some(a => a.status === 'rejected');

      if (hasRejection) {
        overallStatus = 'rejected';
      } else if (isComplete) {
        completedLevels.push(levelNumber);
      } else if (!currentLevel) {
        currentLevel = levelNumber;
      }

      const step: ApprovalStep = {
        levelId: levelApprovals[0].levelId || '',
        levelNumber,
        name: levelApprovals[0].levelName || `Level ${levelNumber}`,
        requiredRole: levelApprovals[0].requiredRole || '',
        requiredCount: levelApprovals.length,
        isParallel: true,
        status: hasRejection ? 'rejected' : isComplete ? 'approved' : 'pending',
        approvers: levelApprovals.map(approval => ({
          userId: approval.approverId,
          status: approval.status,
          approvedAt: approval.approvedAt,
          comments: approval.comments
        }))
      };

      steps.push(step);
    }

    // If all levels are complete and no rejections, workflow is approved
    if (completedLevels.length === levelNumbers.length && overallStatus !== 'rejected') {
      overallStatus = 'approved';
    }

    return {
      status: overallStatus,
      currentLevel,
      completedLevels,
      totalLevels: levelNumbers.length,
      steps
    };
  }
}

export const approvalWorkflowEngine = new ApprovalWorkflowEngine();