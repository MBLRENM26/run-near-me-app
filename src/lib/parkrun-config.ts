import type { ParkrunHubConfig } from "@/components/parkrun/ParkrunHub";

export const ADULT_PARKRUN_CONFIG: ParkrunHubConfig = {
  variant: "adult",
  h1: "Parkrun Locations in the UK",
  intro:
    "Free, weekly, timed 5K runs every Saturday morning. Browse every parkrun across the UK — find your local event and turn up at 9am.",
  scheduleLine: "Every Saturday at 9:00am",
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
      a: "Register for free at parkrun.org.uk, print your personal barcode, then turn up to any UK parkrun at 8:50am on a Saturday. Bring the barcode to be scanned at the finish.",
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
  scheduleLine: "Every Sunday at 9:30am",
  siblingLink: { to: "/parkrun-events", label: "Adult parkrun (5K)" },
  faqs: [
    {
      q: "What is junior parkrun?",
      a: "Junior parkrun is a free, weekly, timed 2 kilometre run for children aged 4 to 14, held every Sunday morning at 9:30am. It's organised by volunteers in parks across the UK.",
    },
    {
      q: "How old do you have to be for junior parkrun?",
      a: "Children must be aged 4 to 14 to take part. Under-11s should run with an adult; children of all ages must be accompanied by a parent or guardian who is present at the event.",
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
