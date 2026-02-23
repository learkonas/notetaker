https://astralcodexten.substack.com/p/elk-and-the-problem-of-truthful-ai
#acx 
#ai 
#elk

Problem:
Ask an AI about a superstition, and it might give you the superstitution, instead of saying 'this is superstitutious'

How do you solve this? By asking it to tell the truth?
But the AI isn't actually trying to tell you the truth, it's trying to complete the text and predict what comes next

Two problems then. First, if 'tell the truth' has a higher base rate of being followed by a lie, then this prompt will make it likelier to lie. No simple string of words as a prompt can guarantee that it will tell the truth. This is just "a dumb hack"

Second, what the AI might actually optimise for is saying what you think is the truth, rather than the actual truth.

The problem is that it is hard to get the truth out of an AI

And when we think about what rules the AI might be following instead, we can't guarantee that the only rule that aligns with all the training data and reinforcements we give it is  'try to tell the truth', because there might be some other weird rule that also aligns with the training


one bad outcome would be that the AI will have no reason to prefer either “tell the truth” _or_ “tell what the human questioner thinks is the truth”.

If we think about what happens when we train an AI to tell the truth, we could easily be training it to tell us what we think the truth is

This is the problem of  Eliciting Latent Knowledge

An AI could be co-opted to trick us by a bad actor. A bad actor would enable the AI to induce the appearance of a goal, or 'the truth', and then proceed to undermine that goal

You may not even need a bad actor. The AI might just find that it is easier to make a trainer think that the goal has been achieved than to ensure this is the case

The solution needs to be something that rules out this possibility


For every scenario, there are some really specific fixes. ACX discusses the diamond security scenario, where you could higher a really good cybersecurity person to make sure the camera work. And whilst these solutions aren't desirable long term, it may be the case that we see a lot of these solutions: AI's paired with an alignment executive to make sure the AI stays aligned and stop the camera getting hacked.



One class of solutions is to add another 'head' to the AI neural network. One does the task, like security. One tells the truth.

You still have the same problem in principle, but it's no longer incentivised to make you think the diamond is secure
Two classes of truth head systems
-   The **direct translator** (good) looks at what the security AI is “thinking”, faithfully translates its conclusions, and accurately relays them to its programmers.
    
-   The **human simulator** (bad) ignores what the security AI is thinking, focuses on what it would expect a human to think in that situation, and tells its programmers that.

Prima facie, an AI could easily find it easier, or find itself doing by random chance, to simulate what the human wants than directly translate what the security AI is doing

Either, guarantee it to be more expensive to be a human simulator than a direct translator for an AI, when choosing between both of these strategies is a toss-up (implies the same results to everything in the training data (but not, crucially, necessarily everything else)). It has to be more costly to generate a fake image of the diamond than to actually protect the diamond. - it's hard to ensure that the truth is always the most simple approach though

Or rule out the 'just tell human what they want'/lieing entirely in the code

The full report is here: https://www.lesswrong.com/posts/QEYWkRoCn4fZxXQAY/prizes-for-elk-proposals

https://docs.google.com/document/d/1WwsnJQstPq91_Yh-Ch2XRL8H_EpsnjrC1dwZXR37PC8/edit#


ELK is important

But it might also be the case that if we suddenyl get superintelligent AGI, everything we've learnt might become useless.  (much like how humans’ sudden explosion of technological knowledge accumulated in our culture rather than our genes, once we turned the corner)

Even if we don't get left behind, how can we make sure we keep up



