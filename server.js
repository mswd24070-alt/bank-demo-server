const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/*
==================================================
SUPABASE
==================================================
*/

const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    "https://xmegksqwdxutsrpdljaq.supabase.co";

const SUPABASE_KEY =
    process.env.SUPABASE_KEY ||
    "sb_publishable_2yjTS1DTrevOGAuRMmzQ3Q_dft1r1RT";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/*
==================================================
HELPERS
==================================================
*/

function fixVal(value) {
    if (value === null || value === undefined) {
        return "0";
    }

    return String(value).trim();
}

/*
==================================================
HOME
==================================================
*/

app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "Demo server is running"
    });
});

/*
==================================================
LOGIN
==================================================

Android app sends:

account_number
password
device_id
app_version_code
auth_hash

==================================================
*/

app.all("/api/login2.php", async (req, res) => {

    try {

        const account =
            req.body.account_number ||
            req.query.account_number ||
            req.body.p1 ||
            req.query.p1;

        const password =
            req.body.password ||
            req.query.password;

        console.log("LOGIN REQUEST");
        console.log("Account:", account);
        console.log("Device:", req.body.device_id);
        console.log("Version:", req.body.app_version_code);

        if (!account || !password) {

            return res.json({
                status: "failed",
                success: false,
                message: "Missing account number or password"
            });
        }

        /*
        البحث في جدول profiles
        */

        const { data: user, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("account_number_short", String(account))
            .maybeSingle();

        if (error) {

            console.error("Supabase error:", error);

            return res.json({
                status: "failed",
                success: false,
                message: "Database error"
            });
        }

        /*
        الحساب غير موجود
        */

        if (!user) {

            return res.json({
                status: "failed",
                success: false,
                message: "Account not found"
            });
        }

        /*
        كلمة السر غير صحيحة
        */

        if (String(user.password) !== String(password)) {

            return res.json({
                status: "failed",
                success: false,
                message: "Invalid password"
            });
        }

        /*
        تسجيل دخول ناجح
        */

        const name = fixVal(user.full_name);
        const balance = fixVal(user.balance);

        console.log("LOGIN SUCCESS:", account);

        /*
        الرد يحتوي أكثر من اسم لنفس البيانات
        عشان نغطي اختلاف طريقة قراءة التطبيق للـJSON
        */

        return res.json({

            status: "success",

            success: true,

            valid: "valid",

            p1: String(account),

            p2: name,

            p3: balance,

            p4: "valid",

            account_number: String(account),

            full_name: name,

            username: name,

            balance: balance

        });

    } catch (err) {

        console.error("LOGIN ERROR:", err);

        return res.json({
            status: "failed",
            success: false,
            message: "Server error"
        });
    }
});

/*
==================================================
BALANCE
==================================================
*/

app.all("/api/fetch_balance.php", async (req, res) => {

    try {

        const account =
            req.body.account_number ||
            req.query.account_number ||
            req.body.p1 ||
            req.query.p1;

        if (!account) {

            return res.json({
                status: "failed",
                success: false
            });
        }

        const { data: user, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("account_number_short", String(account))
            .maybeSingle();

        if (error || !user) {

            return res.json({
                status: "failed",
                success: false
            });
        }

        const name = fixVal(user.full_name);
        const balance = fixVal(user.balance);

        return res.json({

            status: "success",
            success: true,

            p1: String(account),
            p2: name,
            p3: balance,
            p4: "valid",

            account_number: String(account),
            full_name: name,
            balance: balance

        });

    } catch (err) {

        console.error(err);

        return res.json({
            status: "failed",
            success: false
        });
    }
});

/*
==================================================
ACCOUNT DETAILS
==================================================
*/

app.all("/api/check_internal_account.php", async (req, res) => {

    try {

        const account =
            req.body.account_number_short ||
            req.query.account_number_short ||
            req.body.account_number ||
            req.query.account_number ||
            req.body.p1 ||
            req.query.p1;

        if (!account) {

            return res.json({
                status: "failed",
                success: false
            });
        }

        const { data: user, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("account_number_short", String(account))
            .maybeSingle();

        if (error || !user) {

            return res.json({
                status: "failed",
                success: false
            });
        }

        const name = fixVal(user.full_name);
        const balance = fixVal(user.balance);

        return res.json({

            status: "success",
            success: true,

            p1: String(account),
            p2: name,
            p3: balance,
            p4: "valid",

            data: {
                account_number: String(account),
                account_number_short: String(account),
                full_name: name,
                balance: balance,
                available_balance: balance,
                current_balance: balance,
                currency: "SDG"
            }

        });

    } catch (err) {

        console.error(err);

        return res.json({
            status: "failed",
            success: false
        });
    }
});

/*
==================================================
GET NAME
==================================================
*/

app.all("/api/get_name", async (req, res) => {

    try {

        const account =
            req.body.p1 ||
            req.query.p1 ||
            req.body.account_number ||
            req.query.account_number;

        if (!account) {

            return res.json({
                status: "failed",
                success: false
            });
        }

        const { data: user } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("account_number_short", String(account))
            .maybeSingle();

        if (!user) {

            return res.json({
                status: "failed",
                success: false
            });
        }

        const name = fixVal(user.full_name);

        return res.json({

            status: "success",
            success: true,

            p1: String(account),
            p2: name,

            full_name: name,
            username: name

        });

    } catch (err) {

        return res.json({
            status: "failed",
            success: false
        });
    }
});

/*
==================================================
HEALTH CHECK
==================================================
*/

app.get("/health", (req, res) => {

    res.json({
        status: "ok",
        server: "running",
        database: "configured"
    });

});

/*
==================================================
SERVER
==================================================
*/

app.listen(PORT, "0.0.0.0", () => {

    console.log("=================================");
    console.log("Demo Server Started");
    console.log("Port:", PORT);
    console.log("Supabase:", SUPABASE_URL);
    console.log("=================================");

});
