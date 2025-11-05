"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import {
  addDays,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string; // ISO date string YYYY-MM-DD
};

const CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Entertainment",
  "Utilities",
  "Health",
  "Shopping",
  "Other",
] as const;

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Food");
  const [date, setDate] = useState<string>(() => toISODate(new Date()));

  // Load & persist
  useEffect(() => {
    try {
      const raw = localStorage.getItem("expenses");
      if (raw) {
        const parsed: Expense[] = JSON.parse(raw);
        setExpenses(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("expenses", JSON.stringify(expenses));
    } catch {}
  }, [expenses]);

  const { weekStart, weekEnd } = useMemo(() => {
    const start = startOfWeek(weekAnchor, { weekStartsOn: 1 });
    const end = endOfWeek(weekAnchor, { weekStartsOn: 1 });
    return { weekStart: start, weekEnd: end };
  }, [weekAnchor]);

  const weeklyExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = parseISO(e.date);
      const afterStart = isAfter(d, weekStart) || isSameDay(d, weekStart);
      const beforeEnd = isBefore(d, weekEnd) || isSameDay(d, weekEnd);
      return afterStart && beforeEnd;
    });
  }, [expenses, weekStart, weekEnd]);

  const totalWeekly = useMemo(
    () => weeklyExpenses.reduce((sum, e) => sum + (isFinite(e.amount) ? e.amount : 0), 0),
    [weeklyExpenses]
  );

  const totalsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of CATEGORIES) map.set(cat, 0);
    for (const e of weeklyExpenses) {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    }
    return map;
  }, [weeklyExpenses]);

  function addExpense() {
    const amt = Number(parseFloat(amount));
    if (!description.trim() || !isFinite(amt) || amt <= 0 || !date) return;
    const next: Expense = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: description.trim(),
      amount: Math.round(amt * 100) / 100,
      category,
      date,
    };
    setExpenses((prev) => [next, ...prev]);
    setDescription("");
    setAmount("");
    setCategory("Food");
    setDate(toISODate(new Date()));
  }

  function deleteExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  const pieData = useMemo(() => {
    const labels = Array.from(totalsByCategory.keys());
    const data = Array.from(totalsByCategory.values());
    const colors = [
      "#60a5fa",
      "#34d399",
      "#fbbf24",
      "#f472b6",
      "#f87171",
      "#a78bfa",
      "#4ade80",
      "#c084fc",
    ];
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((_, i) => colors[i % colors.length]),
          borderWidth: 0,
        },
      ],
    };
  }, [totalsByCategory]);

  const barData = useMemo(() => {
    const labels = Array.from(totalsByCategory.keys());
    const data = Array.from(totalsByCategory.values());
    return {
      labels,
      datasets: [
        {
          label: "Amount",
          data,
          backgroundColor: "#60a5fa",
        },
      ],
    };
  }, [totalsByCategory]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold">Weekly Expense Review</h1>

        {/* Week controls */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100"
            onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}
          >
            ? Prev Week
          </button>
          <div className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm">
            {format(weekStart, "MMM d")} ? {format(weekEnd, "MMM d, yyyy")}
          </div>
          <button
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100"
            onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}
          >
            Next Week ?
          </button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-zinc-600">Jump to week of</label>
            <input
              type="date"
              value={toISODate(weekAnchor)}
              onChange={(e) => setWeekAnchor(parseISO(e.target.value))}
              className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm"
            />
          </div>
        </div>

        {/* Add expense */}
        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Add Expense</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addExpense}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-zinc-500">Total This Week</div>
            <div className="text-3xl font-bold">${totalWeekly.toFixed(2)}</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:col-span-2">
            <div className="mb-2 text-sm font-medium">Spend by Category (Pie)</div>
            <div className="h-64">
              <Pie data={pieData} options={{ plugins: { legend: { position: "bottom" } } }} />
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-medium">Spend by Category (Bar)</div>
          <div className="h-72">
            <Bar
              data={barData}
              options={{
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
                maintainAspectRatio: false,
              }}
            />
          </div>
        </div>

        {/* List */}
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">This Week's Expenses</h2>
          {weeklyExpenses.length === 0 ? (
            <div className="text-sm text-zinc-500">No expenses for this week.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-600">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Description</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyExpenses.map((e) => (
                    <tr key={e.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-3">{format(parseISO(e.date), "MMM d")}</td>
                      <td className="py-2 pr-3">{e.description}</td>
                      <td className="py-2 pr-3">{e.category}</td>
                      <td className="py-2 pr-3 font-medium">${e.amount.toFixed(2)}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => deleteExpense(e.id)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
