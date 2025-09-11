/**
 * Email Marketing Integration Utilities
 * Handles Klaviyo and Omnisend API integrations
 */

// Klaviyo API integration
export class KlaviyoService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://a.klaviyo.com/api';
  }

  async addToList(listId, profile) {
    try {
      const response = await fetch(`${this.baseUrl}/v2/list/${listId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profiles: [{
            email: profile.email,
            first_name: profile.firstName,
            last_name: profile.lastName,
            phone_number: profile.phone,
            properties: {
              'VIP Early Access': true,
              'Signup Date': new Date().toISOString(),
            }
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Klaviyo API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Klaviyo integration error:', error);
      throw error;
    }
  }

  async addTag(profileId, tagName) {
    try {
      const response = await fetch(`${this.baseUrl}/v2/profile/${profileId}/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            type: 'tag',
            attributes: {
              name: tagName
            }
          }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Klaviyo tag error:', error);
      return false;
    }
  }
}

// Omnisend API integration
export class OmnisendService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.omnisend.com/v3';
  }

  async addToList(listId, contact) {
    try {
      const response = await fetch(`${this.baseUrl}/contacts`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          tags: ['VIP Early Access'],
          customFields: {
            signupDate: new Date().toISOString(),
            source: 'Early Access Pass App'
          },
          listIDs: [listId]
        })
      });

      if (!response.ok) {
        throw new Error(`Omnisend API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Omnisend integration error:', error);
      throw error;
    }
  }
}

// Generic email marketing service
export class EmailMarketingService {
  constructor(klaviyoApiKey, omnisendApiKey) {
    this.klaviyo = klaviyoApiKey ? new KlaviyoService(klaviyoApiKey) : null;
    this.omnisend = omnisendApiKey ? new OmnisendService(omnisendApiKey) : null;
  }

  async syncSignup(campaign, signup) {
    const results = {
      klaviyo: { success: false, error: null },
      omnisend: { success: false, error: null }
    };

    // Sync to Klaviyo
    if (this.klaviyo && campaign.klaviyoListId) {
      try {
        await this.klaviyo.addToList(campaign.klaviyoListId, signup);
        results.klaviyo.success = true;
      } catch (error) {
        results.klaviyo.error = error.message;
      }
    }

    // Sync to Omnisend
    if (this.omnisend && campaign.omnisendListId) {
      try {
        await this.omnisend.addToList(campaign.omnisendListId, signup);
        results.omnisend.success = true;
      } catch (error) {
        results.omnisend.error = error.message;
      }
    }

    return results;
  }
}
