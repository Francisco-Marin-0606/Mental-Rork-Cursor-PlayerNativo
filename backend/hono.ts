import { Hono } from "hono";
import { cors } from "hono/cors";
import { getUserSubscriptionStatus } from "./services/revenuecat";
import { getCollection } from "./services/mongodb";
import { ObjectId } from "mongodb";

// app will be mounted at /api
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors());

// Simple health check endpoint
app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

// Get user with subscription status from RevenueCat
app.get("/user/:userId/subscription", async (c) => {
  try {
    const userId = c.req.param("userId");
    
    console.log('[Hono] Getting user with subscription status for userId:', userId);
    
    // Fetch user from MongoDB
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      console.log('[Hono] User not found');
      return c.json({ error: "User not found" }, 404);
    }
    
    console.log('[Hono] User found:', JSON.stringify(user, null, 2));
    
    // Check if user has processorData.customId
    const processorData = user.processorData as { customId?: string } | undefined;
    
    if (!processorData || !processorData.customId) {
      console.log('[Hono] User does not have processorData.customId');
      return c.json({
        user,
        subscription: {
          isActive: false,
          subscriptionStatus: 'no_processor_data',
          startDate: '',
          endDate: '',
        },
      });
    }
    
    console.log('[Hono] User has processorData.customId:', processorData.customId);
    
    // Fetch subscription status from RevenueCat
    const subscriptionBadge = await getUserSubscriptionStatus(processorData.customId);
    
    console.log('[Hono] Subscription badge calculated:', JSON.stringify(subscriptionBadge, null, 2));
    
    return c.json({
      user,
      subscription: subscriptionBadge,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Hono] Error getting user subscription:', errorMessage);
    return c.json({ error: errorMessage }, 500);
  }
});

export default app;
