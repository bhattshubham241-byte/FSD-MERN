
/*----- FILE: seedBookingData.js
   PURPOSE: Add shows from 23-Oct-2026 through 30-Oct-2026.
   IMPORTANT: Does not delete existing theatres, shows, users, or admins.
-----*/

require("dotenv").config();

const mongoose = require("mongoose");
const Movie = require("./models/movie");
const Theatre = require("./models/Theatre");
const Show = require("./models/Show");
const connectDB = require("./config/db");

const theatreData = [
  {
    name: "PVR Cinemas",
    location: "Himalaya Mall",
    city: "Ahmedabad",
    screens: 4,
  },
  {
    name: "INOX",
    location: "CG Road",
    city: "Ahmedabad",
    screens: 3,
  },
  {
    name: "Cinepolis",
    location: "Acropolis Mall",
    city: "Ahmedabad",
    screens: 5,
  },
];

const showTimes = [
  ["10:30 AM", "1:45 PM", "5:00 PM", "8:30 PM"],
  ["11:00 AM", "2:30 PM", "6:00 PM", "9:15 PM"],
  ["10:00 AM", "1:30 PM", "4:45 PM", "8:00 PM"],
];

const seed = async () => {
  try {
    await connectDB();

    // Load existing movies. Do not replace your movie collection.
    const movies = await Movie.find();

    if (movies.length === 0) {
      console.log("No movies found. Add movies before creating shows.");
      process.exitCode = 1;
      return;
    }

    // Reuse existing theatres; create only missing ones.
    const theatres = [];

    for (const data of theatreData) {
      let theatre = await Theatre.findOne({
        name: data.name,
        location: data.location,
        city: data.city,
      });

      if (!theatre) {
        theatre = await Theatre.create(data);
        console.log("Created theatre:", theatre.name);
      }

      theatres.push(theatre);
    }

    let inserted = 0;
    let skipped = 0;

    // October is month index 9 in JavaScript Date.
    for (let day = 23; day <= 30; day += 1) {
      const showDate = new Date(Date.UTC(2026, 9, day));

      for (let movieIndex = 0; movieIndex < movies.length; movieIndex += 1) {
        const movie = movies[movieIndex];

        for (
          let theatreIndex = 0;
          theatreIndex < theatres.length;
          theatreIndex += 1
        ) {
          const theatre = theatres[theatreIndex];
          const times = showTimes[theatreIndex];

          for (let timeIndex = 0; timeIndex < times.length; timeIndex += 1) {
            const time = times[timeIndex];

            // Avoid adding the same movie/theatre/date/time twice.
            const exists = await Show.findOne({
              movie: movie._id,
              theatre: theatre._id,
              date: showDate,
              time,
            });

            if (exists) {
              skipped += 1;
              continue;
            }

            await Show.create({
              movie: movie._id,
              theatre: theatre._id,
              date: showDate,
              time,
              screen: (timeIndex % theatre.screens) + 1,
              price: 200,
            });

            inserted += 1;
          }
        }
      }
    }

    console.log("Show creation completed for 23-Oct-2026 to 30-Oct-2026.");
    console.log("New shows created:", inserted);
    console.log("Existing matching shows skipped:", skipped);
  } catch (error) {
    console.error("Booking seed failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seed();
