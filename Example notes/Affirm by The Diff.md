#thediff
#bnpl
#businessstrategy 
#technology 
What's good about BNPL
- split payments into 4. Cash management, align payment with their own cash flows
	- merchants pay Affirm a fee of up to 8%, and in exchange Affirm gets them a set of customers they would otherwise miss out on.
- provide credit
	- credit card interest is impossible to catchup on. Affirm uses simple interest—they actually refund interest for people who pay down balances early.
- Long-term 0% loans are a bit different. These are often used for big-ticket purchases: most famously, Peloton bikes and other exercise equipment, - also Eight Sleep
	- For Eight Sleep, it lets someone switch from asking "Would I pay $2,000 to put a weird fluid-filled temperature-controlling... thing... on my bed?" to "Would I pay $2.25/day for better sleep?"

one important feature to remember is that the underwriting is not for a line of credit, but for a specific purchase. So Affirm can adjust its approval based on exactly what customers are buying, and **what this signals about them**
- All these complexities are unavailable to a credit card company that's underwriting a general line of credit (though spender behavior once they have it may affect whether that line shrinks or grows)
- Improves at scale

Affirm's average transactions per user number has moved up over time, from 2.2 each year at the end of 2020 to 2.5 per year at the end of last year.
	being a borrower is a kind of lock-in, where keeping up with the loan keeps them in the ecosystem
	People also don't want to have too many different creditors

On the other side, merchant lock-in starts when they get used to the sales lift from offering buyers more payment options, and with Affirm's acquisition of Returnly, it gets harder to leave without seriously degrading the buyer experience


**BNPL Economics**
- The way Affirm presents its information leads investors to focus on GMV as the gross indicator, but that's not the ideal way to look at things: GMV captures total volume of transactions, which is a good way to think of Affirm as a payments provider. But if you're modeling it as a lender, you want to think in terms of the total loan value outstanding at any one time.
- A $50 pay-in-four transaction is paid down over the course of two months, so its average dollar-weighted duration is more like one month. Which means the same $50 of lending capacity gets used twelve times a year, approximately, earning up to 8% in transaction revenue each time.
- At, say, a 6% average merchant fee, that $50 is theoretically producing $36/year in upfront fees on $600/year in GMV. A $600 two-year loan paying 20% will make Affirm $120/year interest, plus the merchant cut, but it's tying up $600 in lending capacity instead of $50.




So the way to analyze a BNPL company is to look at their portfolio rather than GMV, and consider:

1.  The interest
2. The merchant fee, expressed as annualized interest
3.  The cost to deploy that capital, including credit losses, funding costs, and processing and servicing fees.


Today, Affirm has a wild profusion of on- and off-balance-sheet financing vehicles—asset-backed securities it can put its loans into.

What asset-backed securities do is allow Affirm to access someone else's capital when they make their loans. But the asset-backed market puts them in a bit of a bind. Affirm's advantage in underwriting turns into a _disadvantage_ in funding, since asset-backed securities are partly defined by FICO score! the exact customers where Affirm has an edge—the deep subprime borrowers who pay off like near-prime ones—also raise their funding cost.

Enter those high-value, long-term, zero-APR contracts for products like Peloton and Eight Sleep. If you're filling up an asset-backed security with various loans of varying maturities, you have to think of a loan's impact on the total in terms of its dollar-months. So a $50 pay-in-four is about 53 dollar-months of subprime, whereas a Peloton Bike+ Starter bought for $52/month over 43 months is 3,234 dollar-months of what is almost certainly a prime borrower.

the credit score for 0% APR loans was 708, compared to 668 for interest-bearing loans. Loans over $4,000 had an average FICO of 741, while loans under $250 averaged 650. So those large, long-term loans are a way for Affirm to get whatever credit mix they want in order to sell asset-backed securities when they're in the highest demand.



**Building a financial mode**
#finance

You can firm up this model by looking at all of their lending-related revenue and comparing it to all of their incremental costs, like credit losses, funding, and servicing (accounting details get hairy here, but many of the complexities net out over time and generally make sense)
The first number gets you a sort of gross yield on the portfolio: irrespective of whether they make money from merchant fees, collecting interest, or selling into asset-backed securities, how much do the dollars in Affirm's system produce for Affirm.
The second gets you a net number: if they somehow wished away all of their R&D, marketing, and general & administrative costs, what would Affirm make as purely a balance sheet deployed to certain categories of loans

What you get looks like this (I'm using calendar quarters):

So they've built a nice machine that takes in money and, after accounting for all financing-related costs, earns somewhere in the high-single to low-double digits on it. Meanwhile, this funding amount has grown in the 70-90% range

Building this kind of machine is hard, because it starts by getting good data on alternative lending models, then deploying them to see what happens. Getting this project funded is a tough pitch for two reasons. Raise money from an equity investor, and they'll see that they're investing in a pool of illiquid subprime consumer loans with a lot of extra operating expense layered on top. No, thanks! Raise the money by borrowing, and you're asking a borrower to front money for a pool of investments with mixed and uncertain credit quality, and upside the lender won't capture much of. Once there's been an initial pool of loans, it's much easier to figure out what their actual returns look like, but achieving statistical significance in lending is a capital-intensive proposition