# VIP Early Access Pass App - Setup Instructions

## What We've Built

A complete Shopify app that allows stores to create VIP early access campaigns with the following features:

### ✅ Core Features Implemented

1. **Campaign Management Dashboard**
   - Create, edit, delete campaigns
   - View analytics (views, signups, conversion rates)
   - Toggle campaign active/inactive status
   - Copy secret links

2. **Multiple Access Methods**
   - Password protection
   - Secret links
   - Email signup
   - Password OR email signup

3. **Public Access Pages**
   - Beautiful, responsive early access pages
   - Form validation and error handling
   - Real-time feedback

4. **Email Integration**
   - Klaviyo sync with custom tags
   - Omnisend sync with custom fields
   - Automatic contact creation and list management

5. **Database Schema**
   - PostgreSQL with Prisma ORM
   - Campaign and signup tracking
   - Sync status monitoring

## File Structure

```
app/
├── routes/
│   ├── app._index.jsx          # Main dashboard
│   ├── app.campaigns.$id.jsx   # Campaign details
│   └── early-access.$.jsx      # Public access page
├── services/
│   └── emailSync.js            # Email platform integration
└── components/
    └── ProductDisplay.jsx      # Product display component

prisma/
└── schema.prisma               # Database schema

setup.js                        # Database setup script
README.md                       # Documentation
```

## Setup Steps

### 1. Database Configuration

Update your `.env` file with your PostgreSQL connection:

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

### 4. Test Database Connection

```bash
node setup.js
```

### 5. Run the App

```bash
npm run dev
```

## Testing the App

### 1. Create a Campaign

1. Go to `/app` (main dashboard)
2. Click "Create Campaign"
3. Fill in:
   - Name: "Summer Collection VIP"
   - Description: "Exclusive early access to our summer collection"
   - Access Type: "Password Protected"
   - Password: "VIP2024"
   - Klaviyo List ID: (optional)
   - Omnisend List ID: (optional)

### 2. Test Public Access

1. Copy the secret link from the campaign
2. Visit the link in a new browser/incognito window
3. Try entering the password
4. Test email signup (if using email access type)

### 3. View Analytics

1. Go to campaign details page
2. Check the Overview tab for analytics
3. View signups in the Signups tab

## Email Integration Setup

### Klaviyo Integration

1. Get your Klaviyo API key from your account settings
2. Create a list in Klaviyo
3. Add the list ID to your campaign
4. Add `KLAVIYO_API_KEY` to your `.env` file

### Omnisend Integration

1. Get your Omnisend API key from your account
2. Create a list in Omnisend
3. Add the list ID to your campaign
4. Add `OMNISEND_API_KEY` to your `.env` file

## Customization

### Adding Product Integration

To display actual Shopify products, you'll need to:

1. Add Shopify GraphQL queries to fetch products
2. Update the `ProductDisplay` component
3. Integrate with Shopify's product API

### Styling

The app uses Shopify Polaris components for consistent styling. You can customize:
- Colors and themes
- Layout and spacing
- Component variants

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running
2. Check connection string format
3. Ensure database exists
4. Verify user permissions

### Email Sync Issues

1. Check API keys are correct
2. Verify list IDs exist
3. Check network connectivity
4. Review error logs

### App Not Loading

1. Check all dependencies are installed
2. Verify environment variables
3. Check for TypeScript errors
4. Review console logs

## Next Steps

1. **Product Integration**: Add actual Shopify product fetching
2. **Advanced Analytics**: Add more detailed reporting
3. **Custom Styling**: Brand the public pages
4. **Webhook Integration**: Real-time updates
5. **A/B Testing**: Test different access methods

## Support

If you encounter issues:

1. Check the console for errors
2. Verify database connectivity
3. Review the README.md for detailed documentation
4. Check Prisma documentation for database issues

The app is now ready for development and testing!
