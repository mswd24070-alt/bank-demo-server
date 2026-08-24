const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================================
// Basic middleware
// ======================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// Supabase
// Render Environment Variables:
//
// SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY
// ======================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ERROR: Missing Supabase environment variables.");
    process.exit(1);
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
);

// ======================================================
// Helpers
// ======================================================

function fixVal(value) {
    if (value === null || value === undefined) {
        return "0";
    }

    return String(value).trim();
}

function getParam(req, name) {
    return (
        req.body?.[name] ??
        req.query?.[name] ??
        ""
    );
}

// ======================================================
// Health check
// ======================================================

app.get("/health", async (req, res) => {
    res.json({
        status: "ok",
        server: "running",
        database: "configured"
    });
});

app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "Demo server is running"
    });
});

// ======================================================
// LOGIN
//
// Android request:
//
// POST /api/login2.php
//
// account_number=1000001
// password=1234
// device_id=...
// app_version_code=29
// auth_hash=...
// ======================================================

app.post("/api/login2.php", async (req, res) => {
    try {
        const account = fixVal(
            getParam(req, "account_number")
        );

        const password = fixVal(
            getParam(req, "password")
        );

        const deviceId = fixVal(
            getParam(req, "device_id")
        );

        const appVersionCode = fixVal(
            getParam(req, "app_version_code")
        );

        const authHash = fixVal(
            getParam(req, "auth_hash")
        );

        console.log("=================================");
        console.log("LOGIN REQUEST");
        console.log("Account:", account);
        console.log("Device:", deviceId);
        console.log("App Version:", appVersionCode);
        console.log("Auth hash received:", authHash ? "YES" : "NO");
        console.log("=================================");

        if (!account || !password) {
            return res.status(400).json({
                status: "failed",
                success: false,
                message: "Missing account number or password"
            });
        }

        // Search account
        const { data: user, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("account_number_short", account)
            .maybeSingle();

        if (error) {
            console.error("Supabase error:", error);

            return res.status(500).json({
                status: "failed",
                success: false,
                message: "Database error"
            });
        }

        if (!user) {
            console.log("LOGIN FAILED: account not found");

            return res.json({
                status: "failed",
                success: false,
                message: "Account not found"
            });
        }

        // Demo login password check
        if (String(user.password) !== password) {
            console.log("LOGIN FAILED: wrong password");

            return res.json({
                status: "failed",
                success: false,
                message: "Wrong password"
            });
        }

        const fullName = fixVal(user.full_name);
        const balance = fixVal(user.balance);

        console.log("LOGIN SUCCESS:", account);
        console.log("Name:", fullName);
        console.log("Balance:", balance);

        // Response compatible with the values
        // already expected by the demo application.
        return res.json({
            status: "success",
            success: true,

            p1: account,
            p2: fullName,
            p3: balance,
            p4: "valid",

            account_number: account,
            full_name: fullName,
            balance: balance,
            username: fullName
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            status: "failed",
            success: false,
            message: "Server error"
        });
    }
});

// ======================================================
// Optional compatibility path
// ======================================================

app.post("/api/login", async (req, res) => {
    req.url = "/api/login2.php";

    try {
        const account = fixVal(
            getParam(req, "account_number")
        );

        const password = fixVal(
            getParam(req, "password")
        );

        const { data: user, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("account_number_short", account)
            .maybeSingle();

        if (error) {
            console.error(error);

            return res.status(500).json({
                status: "failed",
                success: false
            });
        }

        if (!user || String(user.password) !== password) {
            return res.json({
                status: "failed",
                success: false
            });
        }

        const fullName = fixVal(user.full_name);
        const balance = fixVal(user.balance);

        return res.json({
            status: "success",
            success: true,
            p1: account,
            p2: fullName,
            p3: balance,
            p4: "valid",
            account_number: account,
            full_name: fullName,
            balance: balance,
            username: fullName
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            status: "failed",
            success: false
        });
    }
});

// ======================================================
// Account details
// ======================================================

app.all("/api/fetch_account_details", async (req, res) => {
    try {
        const account =
            getParam(req, "account_number_short") ||
            getParam(req, "account_number") ||
            getParam(req, "p1");

        const { data: user, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("account_number_short", account)
            .maybeSingle();

        if (error) {
            console.error(error);

            return res.status(500).json({
                status: "failed",
                success: false
            });
        }

        if (!user) {
            return res.json({
                status: "failed",
                success: false
            });
        }

        const fullName = fixVal(user.full_name);
        const balance = fixVal(user.balance);

        return res.json({
            status: "success",
            success: true,
            p1: fixVal(account),
            p2: fullName,
            p3: balance,
            p4: "valid",

            data: {
                account_number_full: fixVal(account),
                account_number_short: fixVal(account),
                full_name: fullName,
                balance: balance,
                available_balance: balance,
                current_balance: balance,
                currency: "SDG"
            }
        });

    } catch (error) {
        console.error("ACCOUNT DETAILS ERROR:", error);

        return res.status(500).json({
            status: "failed",
            success: false
        });
    }
});

// ======================================================
// Get account name
// ======================================================

app.all("/api/get_name", async (req, res) => {
    try {
        const account =
            getParam(req, "account_number") ||
            getParam(req, "account_number_short") ||
            getParam(req, "p1");

        const { data: user, error } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("account_number_short", account)
            .maybeSingle();

        if (error) {
            console.error(error);

            return res.status(500).json({
                status: "failed",
                success: false
            });
        }

        if (!user) {
            return res.json({
                status: "failed",
                success: false
            });
        }

        const fullName = fixVal(user.full_name);

        return res.json({
            status: "success",
            success: true,
            p2: fullName,
            full_name: fullName
        });

    } catch (error) {
        console.error("GET NAME ERROR:", error);

        return res.status(500).json({
            status: "failed",
            success: false
        });
    }
});

// ======================================================
// Start server
// ======================================================

app.listen(PORT, "0.0.0.0", () => {
    console.log("=================================");
    console.log("Demo server started");
    console.log("Port:", PORT);
    console.log("Login endpoint:");
    console.log("/api/login2.php");
    console.log("Health:");
    console.log("/health");
    console.log("=================================");
});
