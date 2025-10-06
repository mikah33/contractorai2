import { useMemo, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Receipt, CreditCard, Calendar, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachMonthOfInterval, eachQuarterOfInterval, eachYearOfInterval, subMonths, subQuarters, subYears, addMonths } from 'date-fns';

interface Project {
  id: string;
  name: string;
  totalBudget: number;
}

interface Receipt {
  id: string;
  projectId?: string;
  amount: number;
  date: string;
  vendor: string;
  category: string;
}

interface Payment {
  id: string;
  projectId: string;
  amount: number;
  date: string;
}

interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  isActive: boolean;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate?: string; // When this expense started (for historical tracking)
}

interface RevenueTrackerProps {
  projects: Project[];
  receipts: Receipt[];
  payments: Payment[];
  recurringExpenses: RecurringExpense[];
}

const RevenueTracker: React.FC<RevenueTrackerProps> = ({
  projects,
  receipts,
  payments,
  recurringExpenses
}) => {
  // Timeframe selector state
  const [timeframe, setTimeframe] = useState<'6months' | 'year' | 'quarterly' | '2years' | 'forecast'>('6months');

  // Calculate totals
  const totalRevenue = useMemo(() =>
    payments.reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );

  // Calculate monthly recurring cost (what you WOULD pay if all were due)
  const monthlyRecurringCost = useMemo(() =>
    recurringExpenses
      .filter(e => e.isActive)
      .reduce((sum, e) => {
        switch (e.frequency) {
          case 'weekly': return sum + (e.amount * 4.33);
          case 'monthly': return sum + e.amount;
          case 'quarterly': return sum + (e.amount / 3);
          case 'yearly': return sum + (e.amount / 12);
          default: return sum + e.amount;
        }
      }, 0),
    [recurringExpenses]
  );

  // Total expenses = ONLY actual receipt expenses (don't auto-add recurring)
  // Recurring expenses should be tracked as receipts when actually paid
  const totalExpenses = useMemo(() =>
    receipts.reduce((sum, r) => sum + r.amount, 0),
    [receipts]
  );

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Revenue by project
  const revenueByProject = useMemo(() => {
    const projectMap = new Map<string, { name: string; revenue: number; expenses: number }>();

    // Initialize with all projects
    projects.forEach(project => {
      projectMap.set(project.id, {
        name: project.name,
        revenue: 0,
        expenses: 0
      });
    });

    // Add payments
    payments.forEach(payment => {
      const existing = projectMap.get(payment.projectId);
      if (existing) {
        existing.revenue += payment.amount;
      }
    });

    // Add expenses
    receipts.forEach(receipt => {
      if (receipt.projectId) {
        const existing = projectMap.get(receipt.projectId);
        if (existing) {
          existing.expenses += receipt.amount;
        }
      }
    });

    return Array.from(projectMap.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
        margin: data.revenue > 0 ? ((data.revenue - data.expenses) / data.revenue) * 100 : 0
      }))
      .filter(p => p.revenue > 0 || p.expenses > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [projects, payments, receipts]);

  // Trend data - configurable by timeframe
  const trendData = useMemo(() => {
    if (timeframe === '6months') {
      const months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date()
      });

      return months.map(month => {
        const periodStart = startOfMonth(month);
        const periodEnd = endOfMonth(month);

        const revenue = payments
          .filter(p => {
            const pDate = new Date(p.date);
            return pDate >= periodStart && pDate <= periodEnd;
          })
          .reduce((sum, p) => sum + p.amount, 0);

        const expenses = receipts
          .filter(r => {
            const rDate = new Date(r.date);
            return rDate >= periodStart && rDate <= periodEnd;
          })
          .reduce((sum, r) => sum + r.amount, 0);

        // Add recurring costs ONLY if:
        // 1. They have a startDate AND this month is >= startDate
        // 2. OR this is a future month (for forecasting)
        const now = new Date();
        const isFutureMonth = periodStart > now;

        const recurringForMonth = recurringExpenses
          .filter(e => {
            if (!e.isActive) return false;

            // If no startDate set, don't include in past months (only show in future)
            if (!e.startDate) {
              return isFutureMonth;
            }

            // If startDate is set, only include if this month is >= startDate
            const expenseStart = new Date(e.startDate);
            return periodStart >= expenseStart;
          })
          .reduce((sum, e) => {
            switch (e.frequency) {
              case 'weekly': return sum + (e.amount * 4.33);
              case 'monthly': return sum + e.amount;
              case 'quarterly': return sum + (e.amount / 3);
              case 'yearly': return sum + (e.amount / 12);
              default: return sum + e.amount;
            }
          }, 0);

        return {
          period: format(month, 'MMM yyyy'),
          revenue,
          expenses: expenses + recurringForMonth,
          profit: revenue - (expenses + recurringForMonth),
          isFuture: false
        };
      });
    } else if (timeframe === 'year') {
      const months = eachMonthOfInterval({
        start: subMonths(new Date(), 11),
        end: new Date()
      });

      return months.map(month => {
        const periodStart = startOfMonth(month);
        const periodEnd = endOfMonth(month);

        const revenue = payments
          .filter(p => {
            const pDate = new Date(p.date);
            return pDate >= periodStart && pDate <= periodEnd;
          })
          .reduce((sum, p) => sum + p.amount, 0);

        const expenses = receipts
          .filter(r => {
            const rDate = new Date(r.date);
            return rDate >= periodStart && rDate <= periodEnd;
          })
          .reduce((sum, r) => sum + r.amount, 0);

        // Add recurring costs ONLY if:
        // 1. They have a startDate AND this month is >= startDate
        // 2. OR this is a future month (for forecasting)
        const now = new Date();
        const isFutureMonth = periodStart > now;

        const recurringForMonth = recurringExpenses
          .filter(e => {
            if (!e.isActive) return false;

            // If no startDate set, don't include in past months (only show in future)
            if (!e.startDate) {
              return isFutureMonth;
            }

            // If startDate is set, only include if this month is >= startDate
            const expenseStart = new Date(e.startDate);
            return periodStart >= expenseStart;
          })
          .reduce((sum, e) => {
            switch (e.frequency) {
              case 'weekly': return sum + (e.amount * 4.33);
              case 'monthly': return sum + e.amount;
              case 'quarterly': return sum + (e.amount / 3);
              case 'yearly': return sum + (e.amount / 12);
              default: return sum + e.amount;
            }
          }, 0);

        return {
          period: format(month, 'MMM yyyy'),
          revenue,
          expenses: expenses + recurringForMonth,
          profit: revenue - (expenses + recurringForMonth),
          isFuture: false
        };
      });
    } else if (timeframe === '2years') {
      // 2 Years historical view - last 24 months
      const months = eachMonthOfInterval({
        start: subMonths(new Date(), 23),
        end: new Date()
      });

      return months.map(month => {
        const periodStart = startOfMonth(month);
        const periodEnd = endOfMonth(month);

        const revenue = payments
          .filter(p => {
            const pDate = new Date(p.date);
            return pDate >= periodStart && pDate <= periodEnd;
          })
          .reduce((sum, p) => sum + p.amount, 0);

        const expenses = receipts
          .filter(r => {
            const rDate = new Date(r.date);
            return rDate >= periodStart && rDate <= periodEnd;
          })
          .reduce((sum, r) => sum + r.amount, 0);

        // Add recurring costs ONLY if:
        // 1. They have a startDate AND this month is >= startDate
        // 2. OR this is a future month (for forecasting)
        const now = new Date();
        const isFutureMonth = periodStart > now;

        const recurringForMonth = recurringExpenses
          .filter(e => {
            if (!e.isActive) return false;

            // If no startDate set, don't include in past months (only show in future)
            if (!e.startDate) {
              return isFutureMonth;
            }

            // If startDate is set, only include if this month is >= startDate
            const expenseStart = new Date(e.startDate);
            return periodStart >= expenseStart;
          })
          .reduce((sum, e) => {
            switch (e.frequency) {
              case 'weekly': return sum + (e.amount * 4.33);
              case 'monthly': return sum + e.amount;
              case 'quarterly': return sum + (e.amount / 3);
              case 'yearly': return sum + (e.amount / 12);
              default: return sum + e.amount;
            }
          }, 0);

        return {
          period: format(month, 'MMM yyyy'),
          revenue,
          expenses: expenses + recurringForMonth,
          profit: revenue - (expenses + recurringForMonth),
          isFuture: false
        };
      });
    } else if (timeframe === 'forecast') {
      // 1 Year forward projection - next 12 months
      const months = eachMonthOfInterval({
        start: new Date(),
        end: addMonths(new Date(), 11)
      });

      return months.map(month => {
        const periodStart = startOfMonth(month);
        const periodEnd = endOfMonth(month);
        const now = new Date();

        // Check if this month has already passed or is current
        const isPast = periodEnd < now;
        const isCurrent = periodStart <= now && periodEnd >= now;

        if (isPast || isCurrent) {
          // Show actual data for past/current months
          const revenue = payments
            .filter(p => {
              const pDate = new Date(p.date);
              return pDate >= periodStart && pDate <= periodEnd;
            })
            .reduce((sum, p) => sum + p.amount, 0);

          const expenses = receipts
            .filter(r => {
              const rDate = new Date(r.date);
              return rDate >= periodStart && rDate <= periodEnd;
            })
            .reduce((sum, r) => sum + r.amount, 0);

          return {
            period: format(month, 'MMM yyyy'),
            revenue,
            expenses,
            profit: revenue - expenses,
            isFuture: false
          };
        } else {
          // Future months - show as empty for user to fill in
          return {
            period: format(month, 'MMM yyyy'),
            revenue: 0,
            expenses: 0,
            profit: 0,
            isFuture: true
          };
        }
      });
    } else {
      // Quarterly view - last 4 quarters
      const quarters = eachQuarterOfInterval({
        start: subQuarters(new Date(), 3),
        end: new Date()
      });

      return quarters.map(quarter => {
        const periodStart = startOfQuarter(quarter);
        const periodEnd = endOfQuarter(quarter);

        const revenue = payments
          .filter(p => {
            const pDate = new Date(p.date);
            return pDate >= periodStart && pDate <= periodEnd;
          })
          .reduce((sum, p) => sum + p.amount, 0);

        const expenses = receipts
          .filter(r => {
            const rDate = new Date(r.date);
            return rDate >= periodStart && rDate <= periodEnd;
          })
          .reduce((sum, r) => sum + r.amount, 0);

        return {
          period: `Q${Math.floor(quarter.getMonth() / 3) + 1} ${format(quarter, 'yyyy')}`,
          revenue,
          expenses,
          profit: revenue - expenses,
          isFuture: false
        };
      });
    }
  }, [payments, receipts, timeframe]);

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();

    receipts.forEach(receipt => {
      const category = receipt.category || 'Other';
      categoryMap.set(category, (categoryMap.get(category) || 0) + receipt.amount);
    });

    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [receipts]);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                ${totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {payments.length} payments received
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="mt-2 text-3xl font-bold text-red-600">
                ${totalExpenses.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <Receipt className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {receipts.length} actual paid expenses
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Net Profit</p>
              <p className={`mt-2 text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(netProfit).toLocaleString()}
              </p>
            </div>
            <div className={`p-3 rounded-full ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {netProfit >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {profitMargin >= 0 ? '+' : ''}{profitMargin.toFixed(1)}% margin
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Est. Monthly Recurring</p>
              <p className="mt-2 text-3xl font-bold text-orange-600">
                ${monthlyRecurringCost.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {recurringExpenses.filter(e => e.isActive).length} active (not auto-paid)
          </p>
        </div>
      </div>

      {/* Trend View with Timeframe Selector */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Financial Trend</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTimeframe('6months')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                timeframe === '6months'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => setTimeframe('year')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                timeframe === 'year'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              12 Months
            </button>
            <button
              onClick={() => setTimeframe('2years')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                timeframe === '2years'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              2 Years
            </button>
            <button
              onClick={() => setTimeframe('quarterly')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                timeframe === 'quarterly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Quarterly
            </button>
            <button
              onClick={() => setTimeframe('forecast')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                timeframe === 'forecast'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              Next Year
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expenses</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trendData.map((item, idx) => (
                <tr key={idx} className={`hover:bg-gray-50 ${item.isFuture ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.period}
                    {item.isFuture && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Future
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${item.isFuture ? 'text-gray-400' : 'text-green-600'}`}>
                    ${item.revenue.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${item.isFuture ? 'text-gray-400' : 'text-red-600'}`}>
                    ${item.expenses.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    item.isFuture ? 'text-gray-400' : item.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${Math.abs(item.profit).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Revenue by Project */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Project</h3>
        <div className="overflow-x-auto">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expenses</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {revenueByProject.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No project revenue data yet
                  </td>
                </tr>
              ) : (
                revenueByProject.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {project.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      ${project.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                      ${project.expenses.toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(project.profit).toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${project.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {project.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Expenses by Category */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expensesByCategory.length === 0 ? (
            <p className="col-span-full text-center text-sm text-gray-500 py-8">
              No expense data yet
            </p>
          ) : (
            expensesByCategory.map((cat) => (
              <div key={cat.category} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                  <span className="text-sm font-bold text-gray-900">${cat.amount.toLocaleString()}</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(cat.amount / totalExpenses) * 100}%` }}
                  ></div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {((cat.amount / totalExpenses) * 100).toFixed(1)}% of total expenses
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenueTracker;
