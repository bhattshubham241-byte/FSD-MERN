/*----- FILE: movieController.js | CONTENT: Controller functions for Movie API operations. | PURPOSE: Contains the business logic for reading and creating movie documents. -----*/

const Movie = require("../models/movie");

/*----- GET /api/movies: Fetch all movies from MongoDB. -----*/
const getMovies = async (req, res) => {
  try {
    const movies = await Movie.find().sort({ createdAt: -1 });

    res.status(200).json(movies);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch movies",
      error: error.message,
    });
  }
};

/*----- GET /api/movies/:id: Fetch one movie using its MongoDB ObjectId. -----*/
const getMovieById = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        message: "Movie not found",
      });
    }

    res.status(200).json(movie);
  } catch (error) {
    res.status(400).json({
      message: "Invalid movie ID or failed to fetch movie",
      error: error.message,
    });
  }
};

/*----- POST /api/movies: Create a new movie from JSON request data. -----*/
const createMovie = async (req, res) => {
  try {
    const movie = await Movie.create(req.body);

    res.status(201).json(movie);
  } catch (error) {
    res.status(400).json({
      message: "Failed to create movie",
      error: error.message,
    });
  }
};

module.exports = {
  getMovies,
  getMovieById,
  createMovie,
};
