// Email marketing integration utilities

export interface EmailContact {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export async function syncToKlaviyo(
  apiKey: string,
  listId: string,
  contact: EmailContact
): Promise<boolean> {
  try {
    // Create or update profile
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15'
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: contact.email,
            first_name: contact.firstName,
            last_name: contact.lastName,
            phone_number: contact.phone,
            properties: {
              'VIP Early Access': true,
              'Early Access Signup Date': new Date().toISOString()
            }
          }
        }
      })
    });
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      const profileId = profileData.data.id;
      
      // Add profile to list
      const listResponse = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${apiKey}`,
          'Content-Type': 'application/json',
          'revision': '2024-02-15'
        },
        body: JSON.stringify({
          data: [{ type: 'profile', id: profileId }]
        })
      });
      
      return listResponse.ok;
    }
  } catch (error) {
    console.error('Klaviyo sync error:', error);
  }
  return false;
}

export async function syncToOmnisend(
  apiKey: string,
  contact: EmailContact
): Promise<boolean> {
  try {
    const response = await fetch('https://api.omnisend.com/v3/contacts', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        tags: ['VIP Early Access'],
        customProperties: {
          'earlyAccessSignup': new Date().toISOString(),
          'vipEarlyAccess': true
        }
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Omnisend sync error:', error);
  }
  return false;
}

export async function syncContact(
  provider: string,
  apiKey: string,
  contact: EmailContact,
  listId?: string
): Promise<boolean> {
  switch (provider) {
    case 'klaviyo':
      if (!listId) return false;
      return await syncToKlaviyo(apiKey, listId, contact);
    
    case 'omnisend':
      return await syncToOmnisend(apiKey, contact);
    
    default:
      return false;
  }
}
