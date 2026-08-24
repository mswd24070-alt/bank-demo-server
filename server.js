const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// Middleware
// ===============================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ===============================
// Supabase
// ===============================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

// ===============================
// Admin protection
// ===============================

const ADMIN_KEY = process.env.ADMIN_KEY;

function checkAdmin(req, res, next) {
  if (!ADMIN_KEY) {
    return res.status(500).json({
      success: false,
      message: "ADMIN_KEY is not configured"
    });
  }

  const providedKey = req.headers["x-admin-key"];

  if (!providedKey || providedKey !== ADMIN_KEY) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }

  next();
}

// ===============================
// Health check
// ===============================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "demo-login-server",
    database: "supabase"
  });
});

// ===============================
// Generate 7-digit account number
// ===============================

async function generateAccountNumber() {
  for (let attempt = 0; attempt < 30; attempt++) {

    const accountNumber = String(
      Math.floor(1000000 + Math.random() * 9000000)
    );

    const { data, error } = await supabase
      .from("demo_accounts")
      .select("id")
      .eq("account_number", accountNumber)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return accountNumber;
    }
  }

  throw new Error("Unable to generate unique account number");
}

// ===============================
// Create Demo Account
// ===============================

app.post("/api/register", async (req, res) => {
  try {

    const name = String(req.body.name || "").trim();
    const password = String(req.body.password || "");

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required"
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name is too long"
      });
    }

    const accountNumber = await generateAccountNumber();

    const { data, error } = await supabase
      .from("demo_accounts")
      .insert({
        account_number: accountNumber,
        name: name,
        password: password,
        balance: 0
      })
      .select("account_number,name,balance,created_at")
      .single();

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Could not create account"
      });
    }

    res.json({
      success: true,
      message: "Demo account created successfully",
      account_number: data.account_number,
      name: data.name,
      balance: data.balance,
      created_at: data.created_at
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ===============================
// Login
// Compatible with:
// /api/login2.php
// ===============================

app.post("/api/login2.php", async (req, res) => {
  try {

    const account = String(
      req.body.account_number || ""
    ).trim();

    const password = String(
      req.body.password || ""
    );

    if (!account || !password) {
      return res.json({
        app_status: "current",
        success: false,
        message: "Account number and password are required",
        p1: "invalid",
        p2: "",
        p3: "0",
        p4: "valid"
      });
    }

    if (!/^\d{7}$/.test(account)) {
      return res.json({
        app_status: "current",
        success: false,
        message: "Invalid account number",
        p1: "invalid",
        p2: "",
        p3: "0",
        p4: "valid"
      });
    }

    const { data, error } = await supabase
      .from("demo_accounts")
      .select("account_number,name,password,balance")
      .eq("account_number", account)
      .maybeSingle();

    if (error) {
      console.error(error);

      return res.status(500).json({
        app_status: "current",
        success: false,
        message: "Database error",
        p1: "invalid",
        p2: "",
        p3: "0",
        p4: "valid"
      });
    }

    if (!data || data.password !== password) {
      return res.json({
        app_status: "current",
        success: false,
        message: "Invalid account number or password",
        p1: "invalid",
        p2: "",
        p3: "0",
        p4: "valid"
      });
    }

    // Keep balance as a String because
    // some versions of the Demo app expect String values.
    const balanceString = String(data.balance);

    res.json({
      app_status: "current",
      success: true,

      username: data.name,
      account_number: data.account_number,
      balance: Number(data.balance),

      // Compatibility fields
      p1: "success",
      p2: data.name,
      p3: balanceString,
      p4: "valid",

      message: "Login successful"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      app_status: "current",
      success: false,
      message: "Server error",
      p1: "invalid",
      p2: "",
      p3: "0",
      p4: "valid"
    });
  }
});

// ===============================
// Admin: Account Details
// ===============================

app.get(
  "/api/admin/account/:accountNumber",
  checkAdmin,
  async (req, res) => {

    try {

      const accountNumber = String(
        req.params.accountNumber || ""
      ).trim();

      if (!/^\d{7}$/.test(accountNumber)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account number"
        });
      }

      const { data, error } = await supabase
        .from("demo_accounts")
        .select(
          "account_number,name,balance,created_at,updated_at"
        )
        .eq("account_number", accountNumber)
        .maybeSingle();

      if (error) {
        console.error(error);

        return res.status(500).json({
          success: false,
          message: "Database error"
        });
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Account not found"
        });
      }

      res.json({
        success: true,
        account: data
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message: "Server error"
      });
    }
  }
);

// ===============================
// Admin: List Accounts
// ===============================

app.get(
  "/api/admin/accounts",
  checkAdmin,
  async (req, res) => {

    try {

      const { data, error } = await supabase
        .from("demo_accounts")
        .select(
          "account_number,name,balance,created_at,updated_at"
        )
        .order("created_at", {
          ascending: false
        });

      if (error) {
        console.error(error);

        return res.status(500).json({
          success: false,
          message: "Database error"
        });
      }

      res.json({
        success: true,
        accounts: data || []
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message: "Server error"
      });
    }
  }
);

// ===============================
// 404
// ===============================

app.use((req, res) => {

  res.status(404).json({
    success: false,
    message: "Endpoint not found"
  });

});

// ===============================
// Start server
// ===============================

app.listen(PORT, "0.0.0.0", () => {

  console.log(
    `Demo server running on port ${PORT}`
  );

});
