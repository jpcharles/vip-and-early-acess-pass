/**
 * Campaign Management Utilities
 * Handles access control, secret link generation, and campaign logic
 */

import crypto from 'crypto-js';
import bcrypt from 'bcryptjs';

export class CampaignUtils {
  /**
   * Generate a unique secret link for a campaign
   */
  static generateSecretLink() {
    return crypto.lib.WordArray.random(32).toString(crypto.enc.Hex);
  }

  /**
   * Hash a password for secure storage
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Check if a campaign is accessible based on access type
   */
  static async checkAccess(campaign, accessData) {
    const now = new Date();
    
    // Check if campaign is active
    if (!campaign.isActive) {
      return { allowed: false, reason: 'Campaign is not active' };
    }

    // Check if campaign has expired
    if (campaign.expiresAt && now > campaign.expiresAt) {
      return { allowed: false, reason: 'Campaign has expired' };
    }

    switch (campaign.accessType) {
      case 'PASSWORD':
        if (!accessData.password) {
          return { allowed: false, reason: 'Password required' };
        }
        const passwordValid = await this.verifyPassword(accessData.password, campaign.password);
        return { 
          allowed: passwordValid, 
          reason: passwordValid ? null : 'Invalid password' 
        };

      case 'SECRET_LINK':
        if (!accessData.secretLink) {
          return { allowed: false, reason: 'Secret link required' };
        }
        return { 
          allowed: accessData.secretLink === campaign.secretLink, 
          reason: accessData.secretLink === campaign.secretLink ? null : 'Invalid secret link' 
        };

      case 'EMAIL_SIGNUP':
        // For email signup, we just need to verify the email is provided
        return { 
          allowed: !!accessData.email, 
          reason: accessData.email ? null : 'Email required for signup' 
        };

      case 'PASSWORD_OR_SIGNUP':
        // Allow access if either password is correct OR email is provided for signup
        if (accessData.password) {
          const passwordValid = await this.verifyPassword(accessData.password, campaign.password);
          if (passwordValid) {
            return { allowed: true, reason: null };
          }
        }
        if (accessData.email) {
          return { allowed: true, reason: null };
        }
        return { allowed: false, reason: 'Password or email signup required' };

      default:
        return { allowed: false, reason: 'Invalid access type' };
    }
  }

  /**
   * Generate a public URL for a gated page
   */
  static generateGatedPageUrl(slug, baseUrl) {
    return `${baseUrl}/early-access/${slug}`;
  }

  /**
   * Generate a secret link URL for a campaign
   */
  static generateSecretLinkUrl(secretLink, baseUrl) {
    return `${baseUrl}/early-access/secret/${secretLink}`;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate a unique slug from a title
   */
  static generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  /**
   * Check if a campaign has any products or collections
   */
  static hasProductsOrCollections(campaign) {
    return campaign.productIds.length > 0 || campaign.collectionIds.length > 0;
  }

  /**
   * Format campaign data for display
   */
  static formatCampaignForDisplay(campaign) {
    return {
      ...campaign,
      signupCount: campaign.signups?.length || 0,
      hasProducts: this.hasProductsOrCollections(campaign),
      isExpired: campaign.expiresAt ? new Date() > campaign.expiresAt : false,
      secretLinkUrl: campaign.secretLink ? 
        this.generateSecretLinkUrl(campaign.secretLink, process.env.SHOPIFY_APP_URL) : null
    };
  }
}
