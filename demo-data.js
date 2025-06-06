// Demo data scenarios for MPAC UI Enhancer
// This file contains realistic but synthetic transaction data for demonstration purposes

const DEMO_SCENARIOS = {
  'clean': {
    name: 'Clean AEN - No Issues',
    description: 'Perfect maintenance periods with no gaps or late refunds',
    aen: 'SEN-L12345678',
    company: 'TechFlow Solutions',
    transactions: []
  },
  
  'gaps': {
    name: 'Maintenance Gaps',
    description: 'Contains maintenance period gaps requiring tickets',
    aen: 'SEN-L23456789',
    company: 'DataSync Corp',
    transactions: []
  },
  
  'late-refunds': {
    name: 'Late Refunds',
    description: 'Contains refunds issued after 30-day threshold',
    aen: 'SEN-L34567890',
    company: 'CloudBridge Ltd',
    transactions: []
  },
  
  'mixed': {
    name: 'Complex Mixed Issues',
    description: 'Large dataset with both gaps and late refunds',
    aen: 'SEN-L45678901',
    company: 'Enterprise Systems Inc',
    transactions: []
  }
};

// Utility functions for generating realistic demo data
const DemoDataGenerator = {
  // Generate realistic order IDs
  generateOrderId() {
    const prefix = 'AT';
    const number = Math.floor(Math.random() * 900000000) + 100000000;
    return `${prefix}-${number}`;
  },

  // Generate realistic transaction amounts
  generateAmount(type = 'renewal') {
    let base;
    if (type === 'renewal') {
      base = [10, 20, 50, 100, 200, 500, 1000, 2000][Math.floor(Math.random() * 8)];
    } else {
      base = [10, 20, 50, 100, 200][Math.floor(Math.random() * 5)];
    }
    
    // Add some randomness
    const variation = (Math.random() - 0.5) * 0.2 * base;
    return Math.max(1, Math.round(base + variation));
  },

  // Generate date in YYYY-MM-DD format
  formatDate(date) {
    return date.toISOString().split('T')[0];
  },

  // Create maintenance period string
  createMaintenancePeriod(startDate, months = 12) {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    endDate.setDate(endDate.getDate() - 1); // End day before next period starts
    
    return `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;
  },

  // Generate realistic app names
  generateAppName() {
    const apps = [
      'Project Tracker Pro',
      'Team Dashboard',
      'Code Review Assistant',
      'Bug Tracker Plus',
      'Wiki Manager',
      'Time Logger',
      'Resource Planner',
      'Issue Resolver',
      'Task Organizer',
      'Documentation Hub'
    ];
    return apps[Math.floor(Math.random() * apps.length)];
  },

  // Generate realistic customer names
  generateCustomerName() {
    const companies = [
      'Acme Solutions Ltd',
      'Beta Technologies',
      'Gamma Enterprises',
      'Delta Innovations',
      'Epsilon Systems',
      'Zeta Corporation',
      'Eta Consulting',
      'Theta Dynamics',
      'Iota Industries',
      'Kappa Networks'
    ];
    return companies[Math.floor(Math.random() * companies.length)];
  },

  // Generate a transaction object
  createTransaction(config) {
    const {
      saleDate,
      saleType = 'renewal',
      maintenancePeriod,
      amount = null,
      appName = null,
      customerName = null
    } = config;

    return {
      orderId: this.generateOrderId(),
      saleDate: this.formatDate(saleDate),
      saleType: saleType,
      amount: amount || this.generateAmount(saleType),
      maintenancePeriod: maintenancePeriod,
      appName: appName || this.generateAppName(),
      customerName: customerName || this.generateCustomerName(),
      customerTier: ['Tier 1', 'Tier 2', 'Tier 3'][Math.floor(Math.random() * 3)],
      licenseType: ['Commercial', 'Academic', 'Community'][Math.floor(Math.random() * 3)]
    };
  }
};

// Generate Clean Scenario
function generateCleanScenario() {
  const transactions = [];
  const startDate = new Date('2023-01-01');
  
  // Create 12 consecutive months of clean renewals
  for (let i = 0; i < 12; i++) {
    const renewalDate = new Date(startDate);
    renewalDate.setMonth(renewalDate.getMonth() + i);
    
    const maintenancePeriod = DemoDataGenerator.createMaintenancePeriod(renewalDate, 1);
    
    transactions.push(DemoDataGenerator.createTransaction({
      saleDate: renewalDate,
      saleType: 'renewal',
      maintenancePeriod: maintenancePeriod
    }));

    // Add a few refunds within 30 days (normal refunds)
    if (i % 4 === 1) {
      const refundDate = new Date(renewalDate);
      refundDate.setDate(refundDate.getDate() + Math.floor(Math.random() * 25) + 5); // 5-29 days later
      
      transactions.push(DemoDataGenerator.createTransaction({
        saleDate: refundDate,
        saleType: 'refund',
        maintenancePeriod: maintenancePeriod,
        amount: DemoDataGenerator.generateAmount('refund')
      }));
    }
  }
  
  DEMO_SCENARIOS.clean.transactions = transactions;
}

// Generate Gaps Scenario
function generateGapsScenario() {
  const transactions = [];
  let currentDate = new Date('2023-01-01');
  
  // Create transactions with intentional gaps
  const periods = [
    { months: 3, gapAfter: 5 },    // 3 months, then 5 day gap
    { months: 2, gapAfter: 0 },    // 2 months, no gap
    { months: 4, gapAfter: 15 },   // 4 months, then 15 day gap
    { months: 1, gapAfter: 0 },    // 1 month, no gap
    { months: 2, gapAfter: 45 },   // 2 months, then 45 day gap (large)
    { months: 3, gapAfter: 0 }     // 3 months, no gap
  ];

  periods.forEach(period => {
    const maintenancePeriod = DemoDataGenerator.createMaintenancePeriod(currentDate, period.months);
    
    transactions.push(DemoDataGenerator.createTransaction({
      saleDate: currentDate,
      saleType: 'renewal',
      maintenancePeriod: maintenancePeriod
    }));

    // Move to next period start + gap
    currentDate.setMonth(currentDate.getMonth() + period.months);
    if (period.gapAfter > 0) {
      currentDate.setDate(currentDate.getDate() + period.gapAfter);
    }
  });

  DEMO_SCENARIOS.gaps.transactions = transactions;
}

// Generate Late Refunds Scenario
function generateLateRefundsScenario() {
  const transactions = [];
  const startDate = new Date('2023-01-01');
  
  // Create base renewals
  for (let i = 0; i < 8; i++) {
    const renewalDate = new Date(startDate);
    renewalDate.setMonth(renewalDate.getMonth() + i);
    
    const maintenancePeriod = DemoDataGenerator.createMaintenancePeriod(renewalDate, 1);
    
    transactions.push(DemoDataGenerator.createTransaction({
      saleDate: renewalDate,
      saleType: 'renewal',
      maintenancePeriod: maintenancePeriod
    }));

    // Add late refunds (45-90 days after original transaction)
    if (i % 3 === 0) {
      const refundDate = new Date(renewalDate);
      const daysLate = Math.floor(Math.random() * 45) + 45; // 45-89 days
      refundDate.setDate(refundDate.getDate() + daysLate);
      
      transactions.push(DemoDataGenerator.createTransaction({
        saleDate: refundDate,
        saleType: 'refund',
        maintenancePeriod: maintenancePeriod,
        amount: DemoDataGenerator.generateAmount('refund')
      }));
    }
  }
  
  DEMO_SCENARIOS['late-refunds'].transactions = transactions;
}

// Generate Complex Mixed Scenario
function generateMixedScenario() {
  const transactions = [];
  let currentDate = new Date('2023-01-01');
  
  // Larger dataset with mixed issues
  const periods = [
    { months: 2, gapAfter: 10, hasLateRefund: false },
    { months: 3, gapAfter: 0, hasLateRefund: true },
    { months: 1, gapAfter: 0, hasLateRefund: false },
    { months: 4, gapAfter: 20, hasLateRefund: true },
    { months: 2, gapAfter: 0, hasLateRefund: false },
    { months: 1, gapAfter: 35, hasLateRefund: false },
    { months: 3, gapAfter: 0, hasLateRefund: true },
    { months: 2, gapAfter: 0, hasLateRefund: false }
  ];

  periods.forEach((period, index) => {
    const maintenancePeriod = DemoDataGenerator.createMaintenancePeriod(currentDate, period.months);
    
    // Add renewal
    transactions.push(DemoDataGenerator.createTransaction({
      saleDate: currentDate,
      saleType: 'renewal',
      maintenancePeriod: maintenancePeriod
    }));

    // Add regular refunds (within 30 days)
    if (index % 2 === 1) {
      const regularRefundDate = new Date(currentDate);
      regularRefundDate.setDate(regularRefundDate.getDate() + Math.floor(Math.random() * 25) + 5);
      
      transactions.push(DemoDataGenerator.createTransaction({
        saleDate: regularRefundDate,
        saleType: 'refund',
        maintenancePeriod: maintenancePeriod,
        amount: DemoDataGenerator.generateAmount('refund')
      }));
    }

    // Add late refunds
    if (period.hasLateRefund) {
      const lateRefundDate = new Date(currentDate);
      const daysLate = Math.floor(Math.random() * 60) + 35; // 35-94 days
      lateRefundDate.setDate(lateRefundDate.getDate() + daysLate);
      
      transactions.push(DemoDataGenerator.createTransaction({
        saleDate: lateRefundDate,
        saleType: 'refund',
        maintenancePeriod: maintenancePeriod,
        amount: DemoDataGenerator.generateAmount('refund')
      }));
    }

    // Move to next period
    currentDate.setMonth(currentDate.getMonth() + period.months);
    if (period.gapAfter > 0) {
      currentDate.setDate(currentDate.getDate() + period.gapAfter);
    }
  });

  DEMO_SCENARIOS.mixed.transactions = transactions;
}

// Initialize all demo scenarios
function initializeDemoData() {
  console.log('Initializing demo data scenarios...');
  generateCleanScenario();
  generateGapsScenario();
  generateLateRefundsScenario();
  generateMixedScenario();
  console.log('Demo data initialized:', DEMO_SCENARIOS);
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.DEMO_SCENARIOS = DEMO_SCENARIOS;
  window.DemoDataGenerator = DemoDataGenerator;
  window.initializeDemoData = initializeDemoData;
}
