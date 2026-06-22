import { render, screen } from "@testing-library/react";
import { SentimentBreakdownCard } from "@/features/dashboard/components/SentimentBreakdownCard";

describe("SentimentBreakdownCard", () => {
  it("renders the chart and legend counts when there is data", () => {
    render(<SentimentBreakdownCard breakdown={{ positive: 3, neutral: 1, negative: 2 }} />);

    expect(screen.getByRole("img", { name: /sentiment breakdown bar chart/i })).toBeInTheDocument();
    expect(screen.getByText(/Positive: 3/)).toBeInTheDocument();
    expect(screen.getByText(/Neutral: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Negative: 2/)).toBeInTheDocument();
  });

  it("shows an empty state when there are no insights yet", () => {
    render(<SentimentBreakdownCard breakdown={{ positive: 0, neutral: 0, negative: 0 }} />);

    expect(screen.getByText(/no interactions with ai insights yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /sentiment breakdown bar chart/i })).not.toBeInTheDocument();
  });
});
