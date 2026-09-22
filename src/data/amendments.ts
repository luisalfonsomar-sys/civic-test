// All 27 amendments to the U.S. Constitution — purpose, brief history, and which civics test
// questions (by number, from civicsData.ts) touch on each one. Not every amendment has a
// directly correlated question; `relatedQuestionNums` is empty for those, and the screen that
// renders this says so rather than inventing a connection.

export type Amendment = {
  number: number;
  title: string;
  ratified: string;
  purpose: string;
  history: string;
  relatedQuestionNums: number[];
};

export const AMENDMENTS: Amendment[] = [
  {
    number: 1,
    title: "Freedom of Speech, Religion, Press, Assembly, and Petition",
    ratified: "1791",
    purpose:
      "Protects the freedoms to practice any religion (or none), speak and publish freely, gather peacefully, and petition the government for change.",
    history:
      "Part of the Bill of Rights, the first ten amendments James Madison introduced in 1789 to address Anti-Federalist worries that the new Constitution didn't explicitly guarantee individual liberties against the federal government. Ratified December 15, 1791.",
    relatedQuestionNums: [6, 65],
  },
  {
    number: 2,
    title: "Right to Bear Arms",
    ratified: "1791",
    purpose: "Protects the right of the people to keep and bear arms.",
    history:
      "Rooted in English common-law tradition and colonial-era militia service, it was included in the Bill of Rights alongside the other original ten amendments, ratified December 15, 1791.",
    relatedQuestionNums: [6, 65],
  },
  {
    number: 3,
    title: "No Quartering of Soldiers",
    ratified: "1791",
    purpose:
      "Bars the government from housing soldiers in private homes during peacetime without the owner's consent.",
    history:
      "A direct response to the British Quartering Acts before the Revolution, which forced colonists to shelter British troops. Ratified December 15, 1791.",
    relatedQuestionNums: [6],
  },
  {
    number: 4,
    title: "Protection from Unreasonable Search and Seizure",
    ratified: "1791",
    purpose:
      "Requires a warrant, backed by probable cause, before the government can search a person's property or seize their belongings.",
    history:
      "Grew out of colonial outrage over British \"writs of assistance\" — general search warrants that let officials search any home without specific cause. Ratified December 15, 1791.",
    relatedQuestionNums: [6],
  },
  {
    number: 5,
    title: "Due Process, Self-Incrimination, and Double Jeopardy",
    ratified: "1791",
    purpose:
      "Guarantees a grand jury for serious crimes, bars being tried twice for the same offense or forced to testify against yourself, and requires fair compensation when the government takes private property.",
    history:
      "Draws on centuries of English due-process tradition dating back to the Magna Carta, adapted for the new federal government as part of the Bill of Rights. Ratified December 15, 1791.",
    relatedQuestionNums: [6],
  },
  {
    number: 6,
    title: "Right to a Speedy, Public Trial",
    ratified: "1791",
    purpose:
      "Guarantees the accused a speedy public trial by an impartial jury, the right to know the charges, confront witnesses, and have a defense lawyer.",
    history:
      "Responded to colonial-era complaints about trials delayed for years or moved overseas, out of reach of a local jury. Ratified December 15, 1791.",
    relatedQuestionNums: [6],
  },
  {
    number: 7,
    title: "Right to a Jury Trial in Civil Cases",
    ratified: "1791",
    purpose: "Preserves the right to a jury trial in most federal civil lawsuits.",
    history:
      "Extended the jury-trial protections of the 6th Amendment (which covers criminal cases) into civil disputes, as part of the original Bill of Rights. Ratified December 15, 1791.",
    relatedQuestionNums: [6],
  },
  {
    number: 8,
    title: "No Cruel and Unusual Punishment",
    ratified: "1791",
    purpose: "Bans excessive bail, excessive fines, and cruel and unusual punishment.",
    history:
      "Borrowed almost word-for-word from England's 1689 Bill of Rights, meant to stop the harsh punishments and inflated bail the colonists associated with royal courts. Ratified December 15, 1791.",
    relatedQuestionNums: [6],
  },
  {
    number: 9,
    title: "Rights Retained by the People",
    ratified: "1791",
    purpose:
      "Clarifies that listing specific rights in the Constitution doesn't mean the people don't have other rights too.",
    history:
      "Added because some framers worried that spelling out a list of protected rights would let the government later claim anything NOT on the list wasn't protected — this amendment closes that loophole. Ratified December 15, 1791.",
    relatedQuestionNums: [6],
  },
  {
    number: 10,
    title: "Powers Reserved to the States and People",
    ratified: "1791",
    purpose:
      "States that any power the Constitution doesn't give to the federal government, and doesn't forbid to the states, belongs to the states or to the people.",
    history:
      "The last of the original ten amendments, added to reassure states' rights advocates that the new federal government's powers were limited to what the Constitution actually listed. Ratified December 15, 1791.",
    relatedQuestionNums: [6, 60],
  },
  {
    number: 11,
    title: "State Sovereign Immunity",
    ratified: "1795",
    purpose:
      "Limits the ability of individuals to sue a state in federal court, especially a state other than their own.",
    history:
      "Passed in response to Chisholm v. Georgia (1793), where the Supreme Court let a citizen of another state sue Georgia — a ruling states saw as a threat to their sovereignty. Ratified February 7, 1795.",
    relatedQuestionNums: [],
  },
  {
    number: 12,
    title: "Revised Presidential Election Procedure",
    ratified: "1804",
    purpose:
      "Requires electors to cast separate ballots for president and vice president, instead of the top two vote-getters overall becoming president and VP.",
    history:
      "Fixed a flaw exposed by the 1800 election, when Thomas Jefferson and his own running mate Aaron Burr tied in electoral votes and the election had to be decided by the House. Ratified June 15, 1804.",
    relatedQuestionNums: [],
  },
  {
    number: 13,
    title: "Abolition of Slavery",
    ratified: "1865",
    purpose: "Abolishes slavery and involuntary servitude throughout the United States.",
    history:
      "Passed by Congress in January 1865 and ratified that December, after the Union's Civil War victory — it made permanent and nationwide what Lincoln's 1863 Emancipation Proclamation had only applied to Confederate-held territory.",
    relatedQuestionNums: [95, 96],
  },
  {
    number: 14,
    title: "Citizenship and Equal Protection",
    ratified: "1868",
    purpose:
      "Grants citizenship to anyone born or naturalized in the United States and guarantees equal protection and due process under the law.",
    history:
      "One of the three Reconstruction Amendments (13th, 14th, 15th) passed after the Civil War to secure the legal status and rights of formerly enslaved people, overturning the Supreme Court's 1857 Dred Scott decision that had denied Black Americans citizenship.",
    relatedQuestionNums: [68, 97],
  },
  {
    number: 15,
    title: "Voting Rights Regardless of Race",
    ratified: "1870",
    purpose:
      "Prohibits denying a citizen the right to vote based on race, color, or previous condition of servitude.",
    history:
      "The last of the three Reconstruction Amendments. Despite its guarantee, many states used poll taxes, literacy tests, and other tactics to suppress Black voters for decades afterward, until later civil-rights-era laws and the 24th Amendment closed those loopholes.",
    relatedQuestionNums: [63, 98],
  },
  {
    number: 16,
    title: "Federal Income Tax",
    ratified: "1913",
    purpose: "Gives Congress the power to collect a federal income tax.",
    history:
      "Overturned an 1895 Supreme Court ruling that had struck down an earlier federal income tax as unconstitutional, clearing the way for the modern federal tax system.",
    relatedQuestionNums: [71],
  },
  {
    number: 17,
    title: "Direct Election of Senators",
    ratified: "1913",
    purpose: "Requires U.S. senators to be elected directly by the voters of their state, not by state legislatures.",
    history:
      "Responded to Progressive Era concerns about corruption and gridlock in state legislatures picking senators, some of which had gone years without a state legislature able to agree on an appointment.",
    relatedQuestionNums: [32],
  },
  {
    number: 18,
    title: "Prohibition",
    ratified: "1919",
    purpose: "Banned the manufacture, sale, and transportation of alcoholic beverages nationwide.",
    history:
      "The culmination of a decades-long temperance movement. It proved difficult to enforce and fueled organized crime, and it remains the only amendment ever fully repealed — by the 21st Amendment in 1933.",
    relatedQuestionNums: [],
  },
  {
    number: 19,
    title: "Women's Suffrage",
    ratified: "1920",
    purpose: "Guarantees women the right to vote, regardless of sex.",
    history:
      "The culmination of a decades-long women's suffrage movement led by figures like Susan B. Anthony and Elizabeth Cady Stanton, dating back to the 1848 Seneca Falls Convention.",
    relatedQuestionNums: [63, 102],
  },
  {
    number: 20,
    title: "Presidential Terms and Succession Timing",
    ratified: "1933",
    purpose:
      "Moves the start of presidential and congressional terms earlier (from March to January), shortening the \"lame duck\" period after an election.",
    history:
      "Under the original schedule, an outgoing president and Congress stayed in office for four more months after losing an election — a gap that felt especially damaging during the Great Depression's transition between administrations.",
    relatedQuestionNums: [],
  },
  {
    number: 21,
    title: "Repeal of Prohibition",
    ratified: "1933",
    purpose: "Repeals the 18th Amendment, ending nationwide Prohibition.",
    history:
      "The only amendment whose sole purpose is undoing an earlier one. It's also the only amendment ratified by state conventions instead of state legislatures, a method the Constitution allows but Congress otherwise never used.",
    relatedQuestionNums: [],
  },
  {
    number: 22,
    title: "Presidential Term Limit",
    ratified: "1951",
    purpose: "Limits a president to being elected to two terms in office.",
    history:
      "Passed after Franklin D. Roosevelt won four consecutive elections (1932–1944), breaking the two-term precedent George Washington had set voluntarily and every president had followed since.",
    relatedQuestionNums: [37],
  },
  {
    number: 23,
    title: "Electoral Votes for Washington, D.C.",
    ratified: "1961",
    purpose: "Gives Washington, D.C. electoral votes for president, as if it were a state (capped at the number the least-populous state gets).",
    history:
      "Before this amendment, residents of the nation's capital — unlike every state — had no vote at all in presidential elections, despite being subject to federal law and taxes.",
    relatedQuestionNums: [],
  },
  {
    number: 24,
    title: "Abolition of Poll Taxes",
    ratified: "1964",
    purpose: "Bans charging a poll tax as a condition of voting in federal elections.",
    history:
      "Poll taxes had been used, especially in Southern states, to price poorly-resourced Black voters out of exercising the right the 15th Amendment was supposed to guarantee them. Passed during the civil rights movement.",
    relatedQuestionNums: [63],
  },
  {
    number: 25,
    title: "Presidential Succession and Disability",
    ratified: "1967",
    purpose:
      "Spells out what happens if the president dies, resigns, or is unable to serve, and how a vacant vice presidency gets filled.",
    history:
      "Passed after President Kennedy's 1963 assassination exposed how vague the original Constitution was about succession and about what to do if a president were alive but incapacitated.",
    relatedQuestionNums: [40],
  },
  {
    number: 26,
    title: "Voting Age Lowered to 18",
    ratified: "1971",
    purpose: "Lowers the minimum voting age in the United States from 21 to 18.",
    history:
      "Driven largely by the Vietnam War-era argument that if 18-year-olds were old enough to be drafted and sent to fight, they were old enough to vote — it was ratified faster than any other amendment, in just over three months.",
    relatedQuestionNums: [63],
  },
  {
    number: 27,
    title: "Congressional Pay Raises",
    ratified: "1992",
    purpose:
      "Delays any change to Congress's pay from taking effect until after the next House election.",
    history:
      "Originally proposed by James Madison all the way back in 1789 as part of the Bill of Rights, but it wasn't ratified by enough states until a college student's research paper revived interest in it two centuries later, in 1992 — making it both the oldest-proposed and most recently ratified amendment.",
    relatedQuestionNums: [5, 7],
  },
];
