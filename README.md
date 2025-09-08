# VIP Early Access Pass App

A Shopify app that allows stores to create gated product/collection pages accessible only via secret links, passwords, or email signups. Includes automatic sync to Klaviyo/Omnisend with "VIP Early Access" tags.

## Features

- **Multiple Access Methods**: Password protection, secret links, email signup, or combination
- **Campaign Management**: Create and manage multiple early access campaigns
- **Analytics**: Track views, signups, and conversion rates
- **Email Integration**: Auto-sync signups to Klaviyo and Omnisend
- **Product Targeting**: Target specific products or collections
- **Real-time Updates**: Live analytics and signup tracking

## Setup Instructions

### 1. Database Setup

Update the `.env` file with your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://username:password@your-host:5432/vip_early_access?schema=public"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Migration

```bash
npx prisma migrate dev --name init_early_access_models
npx prisma generate
```

### 4. Email Integration (Optional)

Add your API keys to the `.env` file:

```env
KLAVIYO_API_KEY="your_klaviyo_api_key"
OMNISEND_API_KEY="your_omnisend_api_key"
```

### 5. Run the App

```bash
npm run dev
```

## Usage

### Creating a Campaign

1. Go to the app dashboard
2. Click "Create Campaign"
3. Fill in campaign details:
   - Name and description
   - Access type (Password, Secret Link, Email Signup, or Combination)
   - Password (if using password protection)
   - Email list IDs for Klaviyo/Omnisend sync
4. Save the campaign

### Access Types

- **Password Protected**: Users need a password to access
- **Secret Link**: Anyone with the link can access
- **Email Signup**: Users must provide email to access
- **Password or Email**: Users can either use password or sign up with email

### Public Access

Campaigns are accessible via secret links in the format:
```
https://your-shop.myshopify.com/pages/early-access-{campaign-id}
```

### Email Sync

When users sign up, they are automatically:
- Added to your Klaviyo list (if configured)
- Added to your Omnisend list (if configured)
- Tagged with "VIP Early Access" and campaign name
- Stored with custom fields for tracking

## Database Schema

### EarlyAccessCampaign
- Campaign details and settings
- Access control configuration
- Analytics data (views, signups)
- Email integration settings

### Signup
- User signup information
- Sync status with email platforms
- Contact IDs from external services

## API Endpoints

- `GET /app` - Campaign dashboard
- `GET /app/campaigns/:id` - Campaign details
- `GET /early-access/*` - Public access page
- `POST /early-access/*` - Handle signups and authentication

## Development

### Prisma Commands

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# View database
npx prisma studio
```

### Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string

Optional:
- `KLAVIYO_API_KEY` - For Klaviyo integration
- `OMNISEND_API_KEY` - For Omnisend integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
