import { useLoaderData, useActionData, useFetcher } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useState } from "react";
import { db } from "../db.server";

// Email marketing integrations
async function syncToKlaviyo(apiKey: string, listId: string, email: string, firstName?: string, lastName?: string, phone?: string) {
  try {
    const response = await fetch('https://a.klaviyo.com/api/profiles/', {
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
            email,
            first_name: firstName,
            last_name: lastName,
            phone_number: phone,
            properties: {
              'VIP Early Access': true,
              'Early Access Signup Date': new Date().toISOString()
            }
          }
        }
      })
    });
    
    if (response.ok) {
      // Add to list
      const profileData = await response.json();
      const profileId = profileData.data.id;
      
      await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
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
      
      return true;
    }
  } catch (error) {
    console.error('Klaviyo sync error:', error);
  }
  return false;
}

async function syncToOmnisend(apiKey: string, email: string, firstName?: string, lastName?: string, phone?: string) {
  try {
    const response = await fetch('https://api.omnisend.com/v3/contacts', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        firstName,
        lastName,
        phone,
        tags: ['VIP Early Access'],
        customProperties: {
          'earlyAccessSignup': new Date().toISOString()
        }
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Omnisend sync error:', error);
  }
  return false;
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { secretKey } = params;
  
  const campaign = await db.earlyAccessCampaign.findFirst({
    where: { 
      secretKey,
      isActive: true 
    }
  });

  if (!campaign) {
    throw new Response("Early access campaign not found or inactive", { status: 404 });
  }

  return json({ campaign });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { secretKey } = params;
  const formData = await request.formData();
  
  const campaign = await db.earlyAccessCampaign.findFirst({
    where: { 
      secretKey,
      isActive: true 
    }
  });

  if (!campaign) {
    return json({ error: "Campaign not found" }, { status: 404 });
  }

  const email = formData.get("email") as string;
  const firstName = formData.get("firstName") as string || null;
  const lastName = formData.get("lastName") as string || null;
  const phone = formData.get("phone") as string || null;

  if (!email) {
    return json({ error: "Email is required" }, { status: 400 });
  }

  try {
    // Check if already signed up
    const existingSignup = await db.earlyAccessSignup.findFirst({
      where: {
        campaignId: campaign.id,
        email
      }
    });

    if (existingSignup) {
      return json({ error: "You're already signed up for early access!" }, { status: 400 });
    }

    // Create signup
    const signup = await db.earlyAccessSignup.create({
      data: {
        campaignId: campaign.id,
        email,
        firstName,
        lastName,
        phone,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("remote-addr"),
        userAgent: request.headers.get("user-agent"),
        referrer: request.headers.get("referer"),
      }
    });

    // Sync to email marketing platform
    let emailSynced = false;
    if (campaign.emailProvider && campaign.emailApiKey) {
      if (campaign.emailProvider === "klaviyo" && campaign.emailListId) {
        emailSynced = await syncToKlaviyo(campaign.emailApiKey, campaign.emailListId, email, firstName, lastName, phone);
      } else if (campaign.emailProvider === "omnisend") {
        emailSynced = await syncToOmnisend(campaign.emailApiKey, email, firstName, lastName, phone);
      }

      if (emailSynced) {
        await db.earlyAccessSignup.update({
          where: { id: signup.id },
          data: {
            syncedToEmail: true,
            syncedAt: new Date(),
            emailProvider: campaign.emailProvider
          }
        });
      }
    }

    return json({ success: true, emailSynced });
  } catch (error) {
    console.error('Signup error:', error);
    return json({ error: "Failed to sign up. Please try again." }, { status: 500 });
  }
};

export default function EarlyAccessPage() {
  const { campaign } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher();
  
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: ""
  });

  const isSubmitting = fetcher.state === "submitting";
  const isSuccess = actionData?.success;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, value);
    });
    fetcher.submit(form, { method: "post" });
  };

  if (isSuccess) {
    return (
      <div style={{
        minHeight: "100vh",
        backgroundColor: campaign.backgroundColor,
        color: campaign.textColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <div style={{
          maxWidth: "500px",
          padding: "40px",
          textAlign: "center",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderRadius: "12px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>Ìæâ</div>
          <h1 style={{ marginBottom: "20px", color: "#333" }}>You're In!</h1>
          <p style={{ fontSize: "18px", marginBottom: "20px", color: "#666" }}>
            Thank you for signing up for early access to <strong>{campaign.name}</strong>!
          </p>
          <p style={{ color: "#666" }}>
            We'll notify you as soon as it's available. Keep an eye on your inbox!
          </p>
          {actionData?.emailSynced && (
            <p style={{ marginTop: "15px", fontSize: "14px", color: "#28a745" }}>
              ‚úì You've been added to our VIP list
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: campaign.backgroundColor,
      color: campaign.textColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        maxWidth: "500px",
        padding: "40px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>Ì¥ê</div>
          <h1 style={{ marginBottom: "10px", color: "#333" }}>
            VIP Early Access
          </h1>
          <h2 style={{ marginBottom: "20px", color: "#555", fontWeight: "normal" }}>
            {campaign.name}
          </h2>
          {campaign.customMessage && (
            <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.5" }}>
              {campaign.customMessage}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {actionData?.error && (
            <div style={{
              padding: "12px",
              backgroundColor: "#f8d7da",
              color: "#721c24",
              borderRadius: "6px",
              marginBottom: "20px",
              fontSize: "14px"
            }}>
              {actionData.error}
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#333" }}>
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              style={{
                width: "100%",
                padding: "12px",
                border: "2px solid #ddd",
                borderRadius: "6px",
                fontSize: "16px",
                boxSizing: "border-box"
              }}
              placeholder="your@email.com"
            />
          </div>

          <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#333" }}>
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "16px",
                  boxSizing: "border-box"
                }}
                placeholder="First name"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#333" }}>
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "16px",
                  boxSizing: "border-box"
                }}
                placeholder="Last name"
              />
            </div>
          </div>

          <div style={{ marginBottom: "30px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#333" }}>
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              style={{
                width: "100%",
                padding: "12px",
                border: "2px solid #ddd",
                borderRadius: "6px",
                fontSize: "16px",
                boxSizing: "border-box"
              }}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !formData.email}
            style={{
              width: "100%",
              padding: "15px",
              backgroundColor: campaign.buttonColor,
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "18px",
              fontWeight: "600",
              cursor: isSubmitting || !formData.email ? "not-allowed" : "pointer",
              opacity: isSubmitting || !formData.email ? 0.6 : 1,
              transition: "all 0.2s ease"
            }}
          >
            {isSubmitting ? "Signing Up..." : "Get Early Access"}
          </button>
        </form>

        <p style={{ 
          textAlign: "center", 
          marginTop: "20px", 
          fontSize: "12px", 
          color: "#999" 
        }}>
          By signing up, you'll be the first to know when this becomes available.
        </p>
      </div>
    </div>
  );
}
