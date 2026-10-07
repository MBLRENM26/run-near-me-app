import type { ParkrunHubConfig } from "@/components/parkrun/ParkrunHub";

export const ADULT_PARKRUN_CONFIG: ParkrunHubConfig = {
  variant: "adult",
  h1: "Parkrun Locations in the UK",
  intro:
    "Free, weekly, timed 5K runs every Saturday morning. Browse every parkrun across the UK — find your local event and check its official page for the start time.",
  scheduleLine: "Every Saturday morning",
  siblingLink: { to: "/junior-parkrun-events", label: "Junior parkrun (2K)" },
  faqs: [
    {
      q: "What is parkrun?",
      a: "parkrun is a free, weekly, timed 5 kilometre run organised by volunteers in parks and open spaces around the world. Anyone can take part — walkers, joggers, runners and spectators all welcome.",
    },
    {
      q: "How much does parkrun cost?",
      a: "parkrun is completely free. You only need to register once on parkrun.org.uk and print your personal barcode to get a finish time.",
    },
    {
      q: "How do I sign up for parkrun?",
      a: "Register for free at parkrun.org.uk, print your personal barcode, then check your chosen event’s official page for the Saturday start time and first-timer briefing. Bring the barcode to be scanned at the finish.",
    },
    {
      q: "Where is my nearest parkrun?",
      a: "There are more than 1,100 adult parkrun locations across the UK. Use the map above or the regional listings below to find the one closest to you.",
    },
  ],
};

export const JUNIOR_PARKRUN_CONFIG: ParkrunHubConfig = {
  variant: "junior",
  h1: "Junior parkrun Locations in the UK",
  intro:
    "Free, weekly, timed 2K runs for children aged 4–14, every Sunday morning. A friendly first running event for kids and a great Sunday morning out for the whole family.",
  scheduleLine: "Every Sunday morning",
  siblingLink: { to: "/parkrun-events", label: "Adult parkrun (5K)" },
  faqs: [
    {
      q: "What is junior parkrun?",
      a: "Junior parkrun is a free, weekly, timed 2 kilometre run for children aged 4 to 14, held every Sunday morning. Check the official event page for its start time. It's organised by volunteers in parks across the UK.",
    },
    {
      q: "How old do you have to be for junior parkrun?",
      a: "Children must be aged 4 to 14 to take part. Children can run the junior course without an adult. Under-11s must be accompanied to and from the event by a responsible adult who stays for its duration.",
    },
    {
      q: "Is junior parkrun free?",
      a: "Yes. Junior parkrun is free for everyone. Register once on parkrun.org.uk to get a personal barcode for finish-time scanning.",
    },
    {
      q: "How long is junior parkrun?",
      a: "Junior parkrun is 2 kilometres (about 1.25 miles). Most events take 10 to 25 minutes to complete depending on age and pace.",
    },
  ],
};
