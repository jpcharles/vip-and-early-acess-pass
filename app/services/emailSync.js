/**
 * Email synchronization service for Klaviyo and Omnisend
 * Handles syncing VIP early access signups to email marketing platforms
 */

const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api';
const OMNISEND_API_BASE = 'https://api.omnisend.com/v3';

/**
 * Sync signup to Klaviyo
 */
export async function syncToKlaviyo(signup, listId, apiKey) {
  try {
    const contactData = {
      data: {
        type: 'profile',
        attributes: {
          email: signup.email,
          first_name: signup.firstName || '',
          last_name: signup.lastName || '',
          properties: {
            'VIP Early Access': true,
            'VIP Early Access Campaign': signup.campaign.name,
            'VIP Early Access Signup Date': signup.createdAt,
            'Source': 'VIP Early Access App'
          }
        }
      }
    };

    const profileResponse = await fetch(`${KLAVIYO_API_BASE}/profiles/`, {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-10-15'
      },
      body: JSON.stringify(contactData)
    });

    if (!profileResponse.ok) {
      throw new Error(`Klaviyo profile creation failed: ${profileResponse.statusText}`);
    }

    const profile = await profileResponse.json();
    const profileId = profile.data.id;

    const listMembershipData = {
      data: {
        type: 'list-membership',
        attributes: {
          profile: {
            data: {
              type: 'profile',
              id: profileId
            }
          }
        }
      }
    };

    const listResponse = await fetch(`${KLAVIYO_API_BASE}/lists/${listId}/relationships/profiles/`, {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-10-15'
      },
      body: JSON.stringify(listMembershipData)
    });

    if (!listResponse.ok) {
      throw new Error(`Klaviyo list membership failed: ${listResponse.statusText}`);
    }

    return {
      success: true,
      contactId: profileId,
      platform: 'klaviyo'
    };
  } catch (error) {
    console.error('Klaviyo sync error:', error);
    return {
      success: false,
      error: error.message,
      platform: 'klaviyo'
    };
  }
}

/**
 * Sync signup to Omnisend
 */
export async function syncToOmnisend(signup, listId, apiKey) {
  try {
    const contactData = {
      email: signup.email,
      firstName: signup.firstName || '',
      lastName: signup.lastName || '',
      tags: ['VIP Early Access', `VIP Campaign: ${signup.campaign.name}`],
      customFields: {
        vip_early_access: true,
        vip_campaign_name: signup.campaign.name,
        vip_signup_date: signup.createdAt,
        source: 'VIP Early Access App'
      }
    };

    const contactResponse = await fetch(`${OMNISEND_API_BASE}/contacts`, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactData)
    });

    if (!contactResponse.ok) {
      throw new Error(`Omnisend contact creation failed: ${contactResponse.statusText}`);
    }

    const contact = await contactResponse.json();
    const contactId = contact.contactID;

    const listMembershipData = {
      contactID: contactId,
      listID: listId
    };

    const listResponse = await fetch(`${OMNISEND_API_BASE}/lists/${listId}/contacts`, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(listMembershipData)
    });

    if (!listResponse.ok) {
      throw new Error(`Omnisend list membership failed: ${listResponse.statusText}`);
    }

    return {
      success: true,
      contactId: contactId,
      platform: 'omnisend'
    };
  } catch (error) {
    console.error('Omnisend sync error:', error);
    return {
      success: false,
      error: error.message,
      platform: 'omnisend'
    };
  }
}

/**
 * Sync signup to all configured email platforms
 */
export async function syncSignupToEmailPlatforms(signup, campaign, credentials = {}) {
  const results = {
    klaviyo: null,
    omnisend: null
  };

  if (campaign.klaviyoListId && credentials.klaviyoApiKey) {
    results.klaviyo = await syncToKlaviyo(signup, campaign.klaviyoListId, credentials.klaviyoApiKey);
  }

  if (campaign.omnisendListId && credentials.omnisendApiKey) {
    results.omnisend = await syncToOmnisend(signup, campaign.omnisendListId, credentials.omnisendApiKey);
  }

  return results;
}
