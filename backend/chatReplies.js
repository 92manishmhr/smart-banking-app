// Canned questions and pre-generated replies for the "AI" chatbox.
// There is NO real AI model behind this — the reply for each question is
// written ahead of time. Placeholders like {name} and {balance} are filled
// in from the logged-in user's data so the answers feel personal.

const QUESTIONS = [
  {
    id: 'summarize-monthly',
    question: 'Summarize my monthly transactions',
    reply:
      'Hi {name}! Here is your summary for June 2026: you received 2 credits ' +
      'totalling NPR {credits} (salary and a remittance) and made {debitCount} ' +
      'payments totalling NPR {debits}. Your biggest expense category was ' +
      'groceries, followed by utilities. Overall you saved about NPR {net} ' +
      'this month — nice work! 🎉',
  },
  {
    id: 'current-balance',
    question: 'What is my current account balance?',
    reply:
      'Your savings account (…{last4}) currently holds NPR {balance}. ' +
      'That is your available balance — there are no pending holds on the account.',
  },
  {
    id: 'grocery-spend',
    question: 'How much did I spend on groceries this month?',
    reply:
      'Looking at June 2026, I found your grocery purchases at Bhatbhateni and ' +
      'Salesberry — they add up to NPR {grocery}. That is roughly {groceryPct}% ' +
      'of your total spending this month.',
  },
  {
    id: 'savings-tips',
    question: 'Give me savings tips based on my spending',
    reply:
      'Based on your recent activity, {name}, here are three ideas: ' +
      '1) Your utility bills are steady — setting up auto-pay avoids late fees. ' +
      '2) Grocery spending peaks at month start; a weekly budget of NPR 5,000 ' +
      'would leave more in savings. 3) Moving NPR 10,000 monthly into a fixed ' +
      'deposit at 7.1% would earn you about NPR 4,600 extra in a year.',
  },
];

// Compute the placeholder values for one user from their transactions.
function buildContext(user, account, transactions) {
  const credits = transactions.filter((t) => t.type === 'credit');
  const debits = transactions.filter((t) => t.type === 'debit');
  const sum = (rows) => rows.reduce((acc, t) => acc + Number(t.amount), 0);

  const creditTotal = sum(credits);
  const debitTotal = sum(debits);
  const groceryTotal = sum(
    debits.filter((t) => /bhatbhateni|salesberry|grocery/i.test(t.description))
  );

  const fmt = (n) => Math.round(n).toLocaleString('en-IN');

  return {
    name: user.full_name.split(' ')[0],
    balance: fmt(account.balance),
    last4: account.account_number.slice(-4),
    credits: fmt(creditTotal),
    debits: fmt(debitTotal),
    debitCount: debits.length,
    net: fmt(creditTotal - debitTotal),
    grocery: fmt(groceryTotal),
    groceryPct: debitTotal ? Math.round((groceryTotal / debitTotal) * 100) : 0,
  };
}

function renderReply(questionId, user, account, transactions) {
  const entry = QUESTIONS.find((q) => q.id === questionId);
  if (!entry) return null;
  const ctx = buildContext(user, account, transactions);
  return entry.reply.replace(/\{(\w+)\}/g, (_, key) =>
    key in ctx ? String(ctx[key]) : `{${key}}`
  );
}

module.exports = { QUESTIONS, renderReply };
