async function getAccount() {
  const accountNumber = document
    .getElementById("accountNumber")
    .value
    .trim();

  const result = document.getElementById("result");

  if (!/^\d{7}$/.test(accountNumber)) {
    result.innerHTML =
      '<p class="error">أدخل رقم حساب مكوّن من 7 أرقام.</p>';
    return;
  }

  result.innerHTML = "<p>جاري البحث...</p>";

  try {
    const response = await fetch(
      `/api/admin/account/${encodeURIComponent(accountNumber)}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      result.innerHTML =
        `<p class="error">${escapeHtml(data.message || "الحساب غير موجود")}</p>`;
      return;
    }

    const account = data.account;

    result.innerHTML = `
      <div class="account">
        <p><strong>رقم الحساب:</strong> ${escapeHtml(account.account_number)}</p>
        <p><strong>الاسم:</strong> ${escapeHtml(account.name)}</p>
        <p><strong>الرصيد:</strong> ${escapeHtml(String(account.balance))}</p>
        <p><strong>تاريخ الإنشاء:</strong> ${escapeHtml(account.created_at || "")}</p>
      </div>
    `;

  } catch (error) {
    console.error(error);
    result.innerHTML =
      '<p class="error">تعذر الاتصال بالسيرفر.</p>';
  }
}


async function loadAccounts() {
  const container = document.getElementById("accounts");

  container.innerHTML = "<p>جاري تحميل الحسابات...</p>";

  try {
    const response = await fetch("/api/admin/accounts");
    const data = await response.json();

    if (!response.ok || !data.success) {
      container.innerHTML =
        `<p class="error">${escapeHtml(data.message || "تعذر تحميل الحسابات")}</p>`;
      return;
    }

    if (!data.accounts || data.accounts.length === 0) {
      container.innerHTML = "<p>لا توجد حسابات.</p>";
      return;
    }

    container.innerHTML = data.accounts.map(account => `
      <div class="account">
        <p>
          <strong>رقم الحساب:</strong>
          ${escapeHtml(account.account_number)}
        </p>

        <p>
          <strong>الاسم:</strong>
          ${escapeHtml(account.name)}
        </p>

        <p>
          <strong>الرصيد:</strong>
          ${escapeHtml(String(account.balance))}
        </p>
      </div>
    `).join("");

  } catch (error) {
    console.error(error);
    container.innerHTML =
      '<p class="error">تعذر الاتصال بالسيرفر.</p>';
  }
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
      }
