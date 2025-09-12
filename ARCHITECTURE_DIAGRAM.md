# VIP Early Access Pass App - System Architecture

## ��️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SHOPIFY ECOSYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   Shopify Admin │    │   Shopify Store │    │   Shopify   │  │
│  │   (App Install) │    │  (Public Pages) │    │   Partners  │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VIP EARLY ACCESS APP                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   Admin Panel   │    │  Public Access  │    │   Email     │  │
│  │   (Dashboard)   │    │     Pages       │    │  Services   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   PostgreSQL    │    │   Prisma ORM    │    │   Sessions  │  │
│  │   (Data Store)  │    │  (Data Access)  │    │ (Shopify)   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## � Data Flow Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SHOP OWNER    │    │   CUSTOMER      │    │  EMAIL PLATFORM │
│                 │    │                 │    │  (Klaviyo/      │
│                 │    │                 │    │   Omnisend)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ 1. Create Campaign   │                      │
          ├─────────────────────►│                      │
          │                      │                      │
          │ 2. Generate Secret   │                      │
          │    Link              │                      │
          │◄─────────────────────┤                      │
          │                      │                      │
          │                      │ 3. Visit Secret Link │
          │                      ├─────────────────────►│
          │                      │                      │
          │                      │ 4. Authentication    │
          │                      │    (Password/Email)  │
          │                      │◄─────────────────────┤
          │                      │                      │
          │                      │ 5. Signup Data       │
          │                      ├─────────────────────►│
          │                      │                      │
          │ 6. View Analytics    │                      │ 7. Auto-Sync
          │◄─────────────────────┤                      │    Contact
          │                      │                      │◄───────────┤
          │                      │                      │
          │ 8. Manage Campaigns  │                      │
          ├─────────────────────►│                      │
```

## ��️ Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              EarlyAccessCampaign                        │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ id: String (Primary Key)                        │   │   │
│  │  │ shop: String (Shopify Shop Domain)              │   │   │
│  │  │ name: String (Campaign Name)                    │   │   │
│  │  │ description: String? (Optional)                 │   │   │
│  │  │ isActive: Boolean (Status)                      │   │   │
│  │  │ accessType: AccessType (PASSWORD|SECRET_LINK|   │   │   │
│  │  │              EMAIL_SIGNUP|PASSWORD_OR_EMAIL)    │   │   │
│  │  │ password: String? (For PASSWORD type)           │   │   │
│  │  │ secretLink: String? (Unique URL)                │   │   │
│  │  │ productIds: String[] (Shopify Product IDs)      │   │   │
│  │  │ collectionIds: String[] (Shopify Collection IDs)│   │   │
│  │  │ klaviyoListId: String? (Klaviyo List ID)        │   │   │
│  │  │ omnisendListId: String? (Omnisend List ID)      │   │   │
│  │  │ totalViews: Int (Analytics)                     │   │   │
│  │  │ totalSignups: Int (Analytics)                   │   │   │
│  │  │ createdAt: DateTime (Timestamp)                 │   │   │
│  │  │ updatedAt: DateTime (Timestamp)                 │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                │                               │
│                                │ 1:Many                       │
│                                ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Signup                               │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ id: String (Primary Key)                        │   │   │
│  │  │ email: String (User Email)                      │   │   │
│  │  │ firstName: String? (Optional)                   │   │   │
│  │  │ lastName: String? (Optional)                    │   │   │
│  │  │ campaignId: String (Foreign Key)                │   │   │
│  │  │ klaviyoSynced: Boolean (Sync Status)            │   │   │
│  │  │ omnisendSynced: Boolean (Sync Status)           │   │   │
│  │  │ klaviyoContactId: String? (External ID)         │   │   │
│  │  │ omnisendContactId: String? (External ID)        │   │   │
│  │  │ createdAt: DateTime (Timestamp)                 │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Session                              │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ id: String (Primary Key)                        │   │   │
│  │  │ shop: String (Shopify Shop Domain)              │   │   │
│  │  │ accessToken: String (Shopify Access Token)      │   │   │
│  │  │ ... (Other Shopify session fields)              │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## � Authentication Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CUSTOMER      │    │   APP SERVER    │    │   DATABASE      │
│                 │    │                 │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ 1. Visit Secret Link │                      │
          ├─────────────────────►│                      │
          │                      │                      │
          │ 2. Find Campaign     │                      │
          │    by Secret Link    │                      │
          │                      ├─────────────────────►│
          │                      │                      │
          │ 3. Return Campaign   │                      │
          │    Data              │                      │
          │◄─────────────────────┤◄─────────────────────┤
          │                      │                      │
          │ 4. Check Access Type │                      │
          │    (Password/Email)  │                      │
          │                      │                      │
          │ 5. Submit Credentials│                      │
          ├─────────────────────►│                      │
          │                      │                      │
          │ 6. Validate Creds   │                      │
          │                      ├─────────────────────►│
          │                      │                      │
          │ 7. Return Auth Result│                      │
          │◄─────────────────────┤◄─────────────────────┤
          │                      │                      │
          │ 8. Grant/Deny Access│                      │
          │◄─────────────────────┤                      │
```

## � Analytics Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CUSTOMER      │    │   APP SERVER    │    │   DATABASE      │
│                 │    │                 │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ 1. Page View         │                      │
          ├─────────────────────►│                      │
          │                      │                      │
          │ 2. Increment Views   │                      │
          │                      ├─────────────────────►│
          │                      │                      │
          │ 3. Signup Action     │                      │
          ├─────────────────────►│                      │
          │                      │                      │
          │ 4. Create Signup     │                      │
          │    Record            │                      │
          │                      ├─────────────────────►│
          │                      │                      │
          │ 5. Increment Signups │                      │
          │                      ├─────────────────────►│
          │                      │                      │
          │ 6. Calculate Metrics │                      │
          │    (Conversion Rate) │                      │
          │                      ├─────────────────────►│
```

## � Email Integration Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   APP SERVER    │    │   KLAVIYO API   │    │  OMNISEND API   │
│                 │    │                 │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ 1. User Signup       │                      │
          │                      │                      │
          │ 2. Create Contact    │                      │
          │    in Klaviyo        │                      │
          ├─────────────────────►│                      │
          │                      │                      │
          │ 3. Add to List       │                      │
          ├─────────────────────►│                      │
          │                      │                      │
          │ 4. Create Contact    │                      │
          │    in Omnisend       │                      │
          │                      ├─────────────────────►│
          │                      │                      │
          │ 5. Add to List       │                      │
          │                      ├─────────────────────►│
          │                      │                      │
          │ 6. Update Sync Status│                      │
          │    in Database       │                      │
```

## � Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Admin Dashboard                          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐ │   │
│  │  │ Campaign List   │  │ Create Campaign │  │ Analytics│ │   │
│  │  │ Component       │  │ Modal           │  │ Component│ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Public Access Pages                       │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐ │   │
│  │  │ Password Form   │  │ Email Signup    │  │ Success  │ │   │
│  │  │ Component       │  │ Form Component  │  │ Component│ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Shared Components                        │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐ │   │
│  │  │ Product Display │  │ Toast Notifications│ Loading  │ │   │
│  │  │ Component       │  │ Component       │  │ Component│ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## � Technical Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        TECHNOLOGY STACK                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend:                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ React 18        │  │ Shopify Polaris │  │ Remix Framework │ │
│  │ (UI Library)    │  │ (Design System) │  │ (Full-Stack)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  Backend:                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Node.js         │  │ Remix Server    │  │ Prisma ORM      │ │
│  │ (Runtime)       │  │ (API Layer)     │  │ (Database)      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  Database:                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ PostgreSQL      │  │ Prisma Client   │  │ Database Migrations│ │
│  │ (Data Store)    │  │ (Type Safety)   │  │ (Schema Management)│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  External APIs:                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Shopify API     │  │ Klaviyo API     │  │ Omnisend API    │ │
│  │ (Store Data)    │  │ (Email Marketing)│  │ (Email Marketing)│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## � Performance Considerations

```
┌─────────────────────────────────────────────────────────────────┐
│                      PERFORMANCE LAYERS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Database Layer:                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Unique Indexes  │  │ Foreign Keys     │  │ Query Optimization│ │
│  │ (Fast Lookups)  │  │ (Data Integrity) │  │ (Efficient Queries)│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  Application Layer:                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Connection Pool │  │ Error Handling  │  │ Async Operations│ │
│  │ (DB Connections)│  │ (Graceful Fail) │  │ (Non-blocking)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  Frontend Layer:                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Component Lazy  │  │ State Management│  │ Optimistic UI   │ │
│  │ Loading         │  │ (Efficient)     │  │ (Fast Feedback) │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

This architecture provides a **scalable**, **maintainable**, and **secure** foundation for the VIP Early Access Pass app, with clear separation of concerns and robust error handling throughout the system.
