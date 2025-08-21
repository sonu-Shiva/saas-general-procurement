import { db } from './server/db.js';
import { dropdownConfigurations, dropdownOptions } from './shared/schema.js';

const testConfigs = [
  {
    screen: "procurement_request",
    category: "priority", 
    fieldName: "priority_level",
    displayName: "Priority Level",
    description: "Priority levels for procurement requests",
    isActive: true,
    sortOrder: 1
  },
  {
    screen: "rfx_management",
    category: "status",
    fieldName: "rfx_status", 
    displayName: "RFx Status",
    description: "Status options for RFx processes",
    isActive: true,
    sortOrder: 2
  },
  {
    screen: "vendor_management",
    category: "category",
    fieldName: "vendor_category",
    displayName: "Vendor Category", 
    description: "Business categories for vendor classification",
    isActive: true,
    sortOrder: 3
  }
];

const testOptions = [
  // Priority levels
  { value: "low", label: "Low", configIndex: 0, sortOrder: 1 },
  { value: "medium", label: "Medium", configIndex: 0, sortOrder: 2 },
  { value: "high", label: "High", configIndex: 0, sortOrder: 3 },
  { value: "urgent", label: "Urgent", configIndex: 0, sortOrder: 4 },
  
  // RFx Status
  { value: "draft", label: "Draft", configIndex: 1, sortOrder: 1 },
  { value: "published", label: "Published", configIndex: 1, sortOrder: 2 },
  { value: "closed", label: "Closed", configIndex: 1, sortOrder: 3 },
  { value: "awarded", label: "Awarded", configIndex: 1, sortOrder: 4 },
  
  // Vendor Categories
  { value: "manufacturing", label: "Manufacturing", configIndex: 2, sortOrder: 1 },
  { value: "services", label: "Services", configIndex: 2, sortOrder: 2 },
  { value: "technology", label: "Technology", configIndex: 2, sortOrder: 3 },
  { value: "consulting", label: "Consulting", configIndex: 2, sortOrder: 4 }
];

async function populateDropdowns() {
  console.log('Populating dropdown configurations...');
  
  const createdConfigs = [];
  
  for (const config of testConfigs) {
    try {
      const [created] = await db.insert(dropdownConfigurations)
        .values(config)
        .returning();
      createdConfigs.push(created);
      console.log(`Created config: ${created.displayName}`);
    } catch (error) {
      console.error(`Failed to create config ${config.displayName}:`, error.message);
    }
  }
  
  // Add options for each config
  for (const option of testOptions) {
    const config = createdConfigs[option.configIndex];
    if (config) {
      try {
        await db.insert(dropdownOptions)
          .values({
            configurationId: config.id,
            value: option.value,
            label: option.label,
            isActive: true,
            sortOrder: option.sortOrder
          });
        console.log(`  Added option: ${option.label} to ${config.displayName}`);
      } catch (error) {
        console.error(`Failed to add option ${option.label}:`, error.message);
      }
    }
  }
  
  console.log('Dropdown population completed!');
}

populateDropdowns().catch(console.error);
