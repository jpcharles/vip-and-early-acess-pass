#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function setup() {
  console.log('Ì∫Ä Setting up VIP Early Access Pass App...\n');
  
  try {
    const prisma = new PrismaClient();
    
    // Test database connection
    console.log('Ì≥° Testing database connection...');
    await prisma.$connect();
    console.log('‚úÖ Database connected successfully!\n');
    
    // Check if tables exist
    console.log('Ì¥ç Checking database schema...');
    const campaigns = await prisma.earlyAccessCampaign.findMany({ take: 1 });
    console.log('‚úÖ Database schema is ready!\n');
    
    console.log('Ìæâ Setup complete! You can now run:');
    console.log('   npm run dev');
    console.log('\nÌ≥ù Don\'t forget to:');
    console.log('   1. Update your .env file with real database credentials');
    console.log('   2. Add Klaviyo/Omnisend API keys if needed');
    console.log('   3. Configure your Shopify app settings');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('‚ùå Setup failed:', error.message);
    console.log('\nÌ¥ß Please check:');
    console.log('   1. Your DATABASE_URL in .env file');
    console.log('   2. PostgreSQL server is running');
    console.log('   3. Database exists and is accessible');
    process.exit(1);
  }
}

setup();
