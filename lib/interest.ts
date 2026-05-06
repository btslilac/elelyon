export class InterestCalculator {
  /**
   * Flat Rate Interest: Interest is calculated as a flat percentage per month.
   * Logic: Principal * (Monthly Rate / 100) * Duration in Months
   */
  static calculateFlatRate(principal: number, monthlyRate: number, durationMonths: number) {
    const totalInterest = principal * (monthlyRate / 100) * durationMonths;
    const totalPayable = principal + totalInterest;
    
    return { totalInterest, totalPayable };
  }

  /**
   * Reducing Balance (Amortization): Standard EMI calculation using a monthly rate.
   */
  static calculateReducingBalance(principal: number, monthlyRatePercent: number, durationMonths: number) {
    const monthlyRate = monthlyRatePercent / 100;
    
    // Handle 0% interest
    if (monthlyRate === 0) {
      return { totalInterest: 0, totalPayable: principal };
    }
    
    const emi = principal * monthlyRate * (Math.pow(1 + monthlyRate, durationMonths)) / (Math.pow(1 + monthlyRate, durationMonths) - 1);
    const totalPayable = emi * durationMonths;
    const totalInterest = totalPayable - principal;

    return { totalInterest, totalPayable };
  }

  /**
   * Dynamically calculate late penalty based on days overdue.
   */
  static calculatePenalty(dueDate: Date, outstandingBalance: number, dailyPenaltyRate: number = 1) {
    const now = new Date();
    if (now <= dueDate || outstandingBalance <= 0) return 0;
    
    const diffTime = Math.abs(now.getTime() - dueDate.getTime());
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return outstandingBalance * (dailyPenaltyRate / 100) * daysOverdue;
  }
}
