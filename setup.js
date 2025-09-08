#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function setup() {
  console.log('� Setting up VIP Early Access Pass App...\n');
  
  try {
    const prisma = new PrismaClient();
    
    // Test database connection
    console.log('� Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully!\n');
    
    // Check if tables exist
    console.log('� Checking database schema...');
    const campaigns = await prisma.earlyAccessCampaign.findMany({ take: 1 });
    console.log('✅ Database schema is ready!\n');
    
    console.log('� Setup complete! You can now run:');
    console.log('   npm run dev');
    console.log('\n� Don\'t forget to:');
    console.log('   1. Update your .env file with real database credentials');
    console.log('   2. Add Klaviyo/Omnisend API keys if needed');
    console.log('   3. Configure your Shopify app settings');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n� Please check:');
    console.log('   1. Your DATABASE_URL in .env file');
    console.log('   2. PostgreSQL server is running');
    console.log('   3. Database exists and is accessible');
    process.exit(1);
  }
}

setup();
