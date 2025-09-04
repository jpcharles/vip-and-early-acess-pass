# VIP Early Access Pass - Shopify App

A powerful Shopify app that enables stores to create gated product and collection pages accessible only via secret links. Perfect for VIP early access campaigns, exclusive product launches, and building excitement around new releases.

## Ì∫Ä Key Features

### Core Functionality
- **Secret Link Access**: Generate unique, secure URLs for each campaign
- **Product & Collection Gating**: Gate individual products or entire collections
- **Beautiful Landing Pages**: Customizable early access signup pages
- **Campaign Management**: Full CRUD operations for managing campaigns
- **Real-time Analytics**: Track signups and campaign performance

### Email Marketing Integration
- **Klaviyo Integration**: Auto-sync signups with "VIP Early Access" tags
- **Omnisend Integration**: Seamless contact synchronization
- **Custom Tags**: Automatic tagging for easy segmentation
- **Signup Tracking**: Monitor email marketing sync status

### Customization Options
- **Brand Colors**: Customize background, text, and button colors
- **Custom Messages**: Add personalized messaging to landing pages
- **Responsive Design**: Mobile-optimized signup experience
- **Campaign Status**: Enable/disable campaigns instantly

## Ì≥¶ Installation & Setup

### Prerequisites
- Node.js 18+ 
- Shopify CLI
- Shopify Partner account
- SQLite (for development) or PostgreSQL (for production)

### Development Setup

1. **Clone and Install**
```bash
git clone <your-repo>
cd vip-early-access
npm install
```

2. **Database Setup**
```bash
npx prisma generate
npx prisma migrate dev
```

3. **Start Development**
```bash
npm run dev
```

4. **Access the App**
- Admin interface: Available through Shopify admin after installation
- Test early access page: `https://your-app-url.com/early-access/{secretKey}`

### Production Deployment

1. **Update Database Provider** (if using PostgreSQL)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. **Deploy to Shopify**
```bash
npm run deploy
```

## ÌæØ How It Works

### For Store Owners

1. **Create Campaign**
   - Choose a product or collection to gate
   - Set up email marketing integration (optional)
   - Customize the landing page appearance
   - Generate a unique secret link

2. **Share Secret Link**
   - Send the link to VIP customers via email, SMS, or social media
   - Only people with the link can access the gated content
   - Track who signs up in real-time

3. **Manage Signups**
   - View all signups in the admin dashboard
   - Export contact data
   - Monitor email marketing sync status
   - Analyze campaign performance

### For Customers

1. **Receive Secret Link**
   - Get exclusive access link from the store
   - Click to visit the early access page

2. **Sign Up for Early Access**
   - Enter email, name, and phone (optional)
   - Submit the form to join the VIP list
   - Get confirmation of successful signup

3. **Get Notified**
   - Automatically added to email marketing lists
   - Receive updates when products become available
   - Enjoy VIP status and early access privileges

## Ìª†Ô∏è Technical Architecture

### Database Schema

```prisma
model EarlyAccessCampaign {
  id              String   @id @default(cuid())
  shop            String
  name            String
  description     String?
  secretKey       String   @unique
  isActive        Boolean  @default(true)
  targetType      String   // "product" or "collection"
  targetId        String   // Shopify ID
  emailProvider   String?  // "klaviyo" or "omnisend"
  emailApiKey     String?
  emailListId     String?
  backgroundColor String   @default("#ffffff")
  textColor       String   @default("#000000")
  buttonColor     String   @default("#007cba")
  customMessage   String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  signups         EarlyAccessSignup[]
}

model EarlyAccessSignup {
  id            String   @id @default(cuid())
  campaignId    String
  email         String
  firstName     String?
  lastName      String?
  phone         String?
  ipAddress     String?
  userAgent     String?
  referrer      String?
  syncedToEmail Boolean  @default(false)
  syncedAt      DateTime?
  emailProvider String?
  createdAt     DateTime @default(now())
  campaign      EarlyAccessCampaign @relation(fields: [campaignId], references: [id])
}
```

### API Endpoints

- `GET /app` - Main dashboard
- `GET /app/campaigns/new` - Create campaign form
- `POST /app/campaigns/new` - Create new campaign
- `GET /app/campaigns/:id` - Campaign details
- `GET /app/campaigns/:id/edit` - Edit campaign form
- `POST /app/campaigns/:id/edit` - Update campaign
- `GET /early-access/:secretKey` - Public landing page
- `POST /early-access/:secretKey` - Handle signup submission

### Email Marketing APIs

#### Klaviyo Integration
- Uses Klaviyo API v2024-02-15
- Creates profiles with VIP Early Access tags
- Adds contacts to specified lists
- Tracks custom properties

#### Omnisend Integration  
- Uses Omnisend v3 API
- Creates contacts with custom tags
- Sets custom properties for segmentation
- Handles phone number formatting

## Ìæ® Customization

### Landing Page Styling

The early access landing pages support full customization:

```typescript
// Campaign customization options
{
  backgroundColor: "#ffffff",  // Page background
  textColor: "#000000",       // Text color
  buttonColor: "#007cba",     // CTA button color
  customMessage: "Get exclusive early access to our latest collection!"
}
```

### Email Marketing Setup

#### Klaviyo Setup
1. Get your Klaviyo API key from Account > Settings > API Keys
2. Create a list for VIP early access signups
3. Copy the list ID from the list URL
4. Configure in campaign settings

#### Omnisend Setup
1. Get your API key from Account > Integrations > API keys
2. Configure in campaign settings
3. Contacts will be tagged automatically

## Ì≥ä Analytics & Reporting

### Campaign Metrics
- Total signups per campaign
- Signup conversion rates
- Geographic distribution (via IP tracking)
- Device/browser analytics (via user agent)
- Referrer tracking

### Email Marketing Sync Status
- Track which contacts were successfully synced
- Monitor sync failures and retry logic
- Export data for external analysis

## Ì¥í Security Features

### Secret Key Generation
- Cryptographically secure random keys
- 30+ character length for maximum security
- Unique per campaign

### Data Protection
- Customer data encrypted in transit
- Secure API key storage
- GDPR-compliant data handling
- Optional data retention policies

## Ì∫Ä Deployment Options

### Shopify App Store
Ready for submission to the Shopify App Store with:
- Complete app listing assets
- Privacy policy compliance
- GDPR compliance
- Webhook handling for app lifecycle

### Self-Hosted
Deploy to your own infrastructure:
- Heroku, Railway, or any Node.js hosting
- PostgreSQL or MySQL database
- Environment variable configuration
- SSL certificate required

## Ì≥à Business Benefits

### For Merchants
- **Increase Engagement**: Build excitement before product launches
- **Grow Email Lists**: Capture high-intent customers
- **VIP Treatment**: Make customers feel special and valued
- **Launch Success**: Ensure strong initial sales with pre-qualified buyers
- **Data Collection**: Gather customer information for marketing

### For Customers
- **Exclusive Access**: Get products before anyone else
- **VIP Status**: Feel valued as a preferred customer
- **Early Bird Benefits**: Access to limited quantities or special pricing
- **Insider Information**: Stay informed about new releases

## Ìª°Ô∏è Privacy & Compliance

### Data Handling
- Minimal data collection (email required, name/phone optional)
- Secure storage with encryption
- Regular data cleanup options
- Export capabilities for data portability

### GDPR Compliance
- Clear consent mechanisms
- Data processing transparency
- Right to deletion support
- Data portability features

## Ì¥ù Support & Contributing

### Getting Help
- Check the documentation
- Review common issues in the FAQ
- Contact support via the app dashboard

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Ì≥Ñ License

This project is licensed under the MIT License - see the LICENSE file for details.

## Ìπè Acknowledgments

- Shopify for the excellent app development platform
- Klaviyo and Omnisend for email marketing APIs
- The Remix framework for the excellent developer experience
- Prisma for the type-safe database layer

---

**Ready to launch your VIP early access campaigns? Install the app and start building excitement around your next product launch!**
