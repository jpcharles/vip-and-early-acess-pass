import { useActionData, useLoaderData, useNavigate, useSubmit } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Select,
  Checkbox,
  ColorPicker,
  Banner,
  FormLayout,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

// Generate a random secret key
function generateSecretKey(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  // Fetch products and collections
  const productsResponse = await admin.graphql(`
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
    }
  `, { variables: { first: 100 } });

  const collectionsResponse = await admin.graphql(`
    query getCollections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
    }
  `, { variables: { first: 100 } });

  const products = productsResponse.data?.products?.edges || [];
  const collections = collectionsResponse.data?.collections?.edges || [];

  return json({ products, collections });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  try {
    const campaign = await db.earlyAccessCampaign.create({
      data: {
        shop: session.shop,
        name: formData.get("name") as string,
        description: formData.get("description") as string || null,
        secretKey: generateSecretKey(),
        targetType: formData.get("targetType") as string,
        targetId: formData.get("targetId") as string,
        emailProvider: formData.get("emailProvider") as string || null,
        emailApiKey: formData.get("emailApiKey") as string || null,
        emailListId: formData.get("emailListId") as string || null,
        backgroundColor: formData.get("backgroundColor") as string || "#ffffff",
        textColor: formData.get("textColor") as string || "#000000",
        buttonColor: formData.get("buttonColor") as string || "#007cba",
        customMessage: formData.get("customMessage") as string || null,
        isActive: formData.get("isActive") === "on",
      },
    });

    return redirect(`/app/campaigns/${campaign.id}`);
  } catch (error) {
    return json({ error: "Failed to create campaign" }, { status: 400 });
  }
};

export default function NewCampaign() {
  const { products, collections } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const submit = useSubmit();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    targetType: "product",
    targetId: "",
    emailProvider: "",
    emailApiKey: "",
    emailListId: "",
    backgroundColor: "#ffffff",
    textColor: "#000000", 
    buttonColor: "#007cba",
    customMessage: "",
    isActive: true,
  });

  const handleSubmit = () => {
    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === "isActive") {
        if (value) form.append(key, "on");
      } else {
        form.append(key, value.toString());
      }
    });
    submit(form, { method: "post" });
  };

  const targetOptions = formData.targetType === "product" 
    ? products.map((edge: any) => ({
        label: edge.node.title,
        value: edge.node.id,
      }))
    : collections.map((edge: any) => ({
        label: edge.node.title,
        value: edge.node.id,
      }));

  return (
    <Page>
      <TitleBar title="Create Early Access Campaign" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text variant="headingLg" as="h1">
                Create New Early Access Campaign
              </Text>
              
              {actionData?.error && (
                <Banner status="critical">
                  {actionData.error}
                </Banner>
              )}

              <FormLayout>
                <TextField
                  label="Campaign Name"
                  value={formData.name}
                  onChange={(value) => setFormData({...formData, name: value})}
                  autoComplete="off"
                  helpText="Give your campaign a memorable name"
                />

                <TextField
                  label="Description (Optional)"
                  value={formData.description}
                  onChange={(value) => setFormData({...formData, description: value})}
                  multiline={3}
                  autoComplete="off"
                />

                <Select
                  label="Target Type"
                  options={[
                    { label: "Product", value: "product" },
                    { label: "Collection", value: "collection" },
                  ]}
                  value={formData.targetType}
                  onChange={(value) => setFormData({...formData, targetType: value, targetId: ""})}
                />

                <Select
                  label={formData.targetType === "product" ? "Select Product" : "Select Collection"}
                  options={[
                    { label: "Choose...", value: "" },
                    ...targetOptions,
                  ]}
                  value={formData.targetId}
                  onChange={(value) => setFormData({...formData, targetId: value})}
                />

                <Text variant="headingMd" as="h3">
                  Email Marketing Integration (Optional)
                </Text>

                <Select
                  label="Email Provider"
                  options={[
                    { label: "None", value: "" },
                    { label: "Klaviyo", value: "klaviyo" },
                    { label: "Omnisend", value: "omnisend" },
                  ]}
                  value={formData.emailProvider}
                  onChange={(value) => setFormData({...formData, emailProvider: value})}
                />

                {formData.emailProvider && (
                  <>
                    <TextField
                      label="API Key"
                      value={formData.emailApiKey}
                      onChange={(value) => setFormData({...formData, emailApiKey: value})}
                      type="password"
                      autoComplete="off"
                    />

                    <TextField
                      label="List/Segment ID"
                      value={formData.emailListId}
                      onChange={(value) => setFormData({...formData, emailListId: value})}
                      autoComplete="off"
                      helpText="The ID of the list or segment to add signups to"
                    />
                  </>
                )}

                <Text variant="headingMd" as="h3">
                  Customization
                </Text>

                <TextField
                  label="Custom Message (Optional)"
                  value={formData.customMessage}
                  onChange={(value) => setFormData({...formData, customMessage: value})}
                  multiline={2}
                  helpText="A custom message to show on the early access page"
                />

                <Checkbox
                  label="Active"
                  checked={formData.isActive}
                  onChange={(value) => setFormData({...formData, isActive: value})}
                  helpText="Whether this campaign is currently active"
                />
              </FormLayout>

              <InlineStack align="end" gap="300">
                <Button onClick={() => navigate("/app")}>
                  Cancel
                </Button>
                <Button 
                  primary 
                  onClick={handleSubmit}
                  disabled={!formData.name || !formData.targetId}
                >
                  Create Campaign
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
