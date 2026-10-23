/*----- FILE: Admin.jsx | CONTENT: MovieMate admin management page. | PURPOSE: Lets administrators add, update, and delete movies, theatres, and shows, including seat layout and ticket-category pricing. -----*/

import { useEffect, useState } from "react";
import { Film, Building2, CalendarPlus, Edit3, Trash2, Save, X } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/admin.css";

const getToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const emptyCategories = [
  { name: "Silver", rows: "A,B", price: 150 },
  { name: "Gold", rows: "C,D", price: 200 },
  { name: "Platinum", rows: "E,F", price: 250 },
];

const initialMovie = { title: "", description: "", genre: "", language: "English", duration: "", releaseDate: getToday(), poster: "", trailer: "", rating: "", rows: "A-F", seatsPerRow: 7, categories: emptyCategories };
const initialTheatre = { name: "", location: "", city: "Ahmedabad", screens: 1 };
const initialShow = { movie: "", theatre: "", date: getToday(), time: "", screen: 1, price: 200 };

/*----- ROW PARSER: Converts A-F into A,B,C,D,E,F and also accepts A,B,C. -----*/
const parseRows = (value) => {
  const text = String(value || "").toUpperCase().replace(/\s/g, "");
  if (/^[A-Z]-[A-Z]$/.test(text)) {
    const [start, end] = text.split("-").map((item) => item.charCodeAt(0));
    if (start <= end) return Array.from({ length: end - start + 1 }, (_, index) => String.fromCharCode(start + index));
  }
  return text.split(",").map((item) => item.trim()).filter(Boolean);
};

function Admin() {
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [shows, setShows] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [movieForm, setMovieForm] = useState(initialMovie);
  const [theatreForm, setTheatreForm] = useState(initialTheatre);
  const [showForm, setShowForm] = useState(initialShow);

  const clearMessages = () => { setMessage(""); setError(""); };

  /*----- LOAD DATA: Loads every entity so the admin can manage current MongoDB records. -----*/
  const loadData = async () => {
    try {
      const response = await api.get("/admin/data");
      setMovies(response.data.movies);
      setTheatres(response.data.theatres);
      setShows(response.data.shows);
    } catch (requestError) { setError(requestError.response?.data?.message || "Failed to load admin data."); }
  };

  useEffect(() => { loadData(); }, []);

  const resetForms = () => {
    setMovieForm(initialMovie); setTheatreForm(initialTheatre); setShowForm(initialShow); setEditing(null);
  };

  const handleMovieSubmit = async (event) => {
    event.preventDefault(); clearMessages();
    try {
      const payload = {
        title: movieForm.title, description: movieForm.description,
        genre: movieForm.genre.split(",").map((item) => item.trim()).filter(Boolean), language: movieForm.language,
        duration: movieForm.duration, releaseDate: movieForm.releaseDate, poster: movieForm.poster,
        trailer: movieForm.trailer, rating: Number(movieForm.rating) || 0,
        seating: {
          rows: parseRows(movieForm.rows), seatsPerRow: Number(movieForm.seatsPerRow),
          categories: movieForm.categories.map((category) => ({ name: category.name, rows: parseRows(category.rows), price: Number(category.price) }))
        }
      };
      if (editing?.type === "movie") await api.put(`/admin/movies/${editing.id}`, payload);
      else await api.post("/admin/movies", payload);
      setMessage(editing?.type === "movie" ? "Movie updated successfully." : "Movie added successfully."); resetForms(); await loadData();
    } catch (requestError) { setError(requestError.response?.data?.message || "Failed to save movie."); }
  };

  const handleTheatreSubmit = async (event) => {
    event.preventDefault(); clearMessages();
    try {
      if (editing?.type === "theatre") await api.put(`/admin/theatres/${editing.id}`, { ...theatreForm, screens: Number(theatreForm.screens) });
      else await api.post("/admin/theatres", { ...theatreForm, screens: Number(theatreForm.screens) });
      setMessage(editing?.type === "theatre" ? "Theatre updated successfully." : "Theatre added successfully."); resetForms(); await loadData();
    } catch (requestError) { setError(requestError.response?.data?.message || "Failed to save theatre."); }
  };

  const handleShowSubmit = async (event) => {
    event.preventDefault(); clearMessages();
    try {
      const payload = { ...showForm, screen: Number(showForm.screen), price: Number(showForm.price) };
      if (editing?.type === "show") await api.put(`/admin/shows/${editing.id}`, payload);
      else await api.post("/admin/shows", payload);
      setMessage(editing?.type === "show" ? "Show updated successfully." : "Show added successfully."); resetForms(); await loadData();
    } catch (requestError) { setError(requestError.response?.data?.message || "Failed to save show."); }
  };

  const editMovie = (movie) => setEditing({ type: "movie", id: movie._id }) || setMovieForm({ ...movie, genre: movie.genre.join(", "), releaseDate: new Date(movie.releaseDate).toISOString().slice(0, 10), rating: movie.rating, rows: movie.seating?.rows?.join(",") || "A-F", seatsPerRow: movie.seating?.seatsPerRow || 8, categories: (movie.seating?.categories || emptyCategories).map((category) => ({ ...category, rows: category.rows.join(",") })) });
  const editTheatre = (theatre) => setEditing({ type: "theatre", id: theatre._id }) || setTheatreForm({ name: theatre.name, location: theatre.location, city: theatre.city, screens: theatre.screens });
  const editShow = (show) => setEditing({ type: "show", id: show._id }) || setShowForm({ movie: show.movie?._id, theatre: show.theatre?._id, date: new Date(show.date).toISOString().slice(0, 10), time: show.time, screen: show.screen, price: show.price });

  const remove = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    clearMessages();
    try { await api.delete(`/admin/${type}s/${id}`); setMessage(`${type[0].toUpperCase() + type.slice(1)} deleted successfully.`); await loadData(); }
    catch (requestError) { setError(requestError.response?.data?.message || `Failed to delete ${type}.`); }
  };

  const updateCategory = (index, field, value) => setMovieForm((previous) => ({ ...previous, categories: previous.categories.map((category, categoryIndex) => categoryIndex === index ? { ...category, [field]: value } : category) }));

  return (
    <main className="admin-page">
      <section className="admin-header">
        <div><p className="admin-label">ADMIN MANAGEMENT</p><h1>MovieMate Admin Panel</h1><p>Welcome, {user?.name}. Manage movies, theatres, shows and ticket pricing.</p></div>
        <div className="admin-badge">Administrator</div>
      </section>

      {message && <p className="admin-message success">{message}</p>}
      {error && <p className="admin-message error">{error}</p>}

      <section className="admin-grid">
        <form className="admin-card" onSubmit={handleMovieSubmit}>
          <div className="admin-card-title"><Film size={22} /><h2>{editing?.type === "movie" ? "Update Movie" : "Add Movie"}</h2></div>
          <label>Title<input value={movieForm.title} onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })} required /></label>
          <label>Description<textarea value={movieForm.description} onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })} required /></label>
          <label>Genres <span>(comma separated)</span><input value={movieForm.genre} onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })} required /></label>
          <div className="admin-two-columns"><label>Language<input value={movieForm.language} onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })} required /></label><label>Duration<input value={movieForm.duration} onChange={(e) => setMovieForm({ ...movieForm, duration: e.target.value })} required /></label></div>
          <div className="admin-two-columns"><label>Release Date<input type="date" value={movieForm.releaseDate} onChange={(e) => setMovieForm({ ...movieForm, releaseDate: e.target.value })} required /></label><label>Rating<input type="number" min="0" max="10" step="0.1" value={movieForm.rating} onChange={(e) => setMovieForm({ ...movieForm, rating: e.target.value })} /></label></div>
          <label>Poster URL<input type="url" value={movieForm.poster} onChange={(e) => setMovieForm({ ...movieForm, poster: e.target.value })} required /></label>
          <label>Trailer URL <span>(optional)</span><input type="url" value={movieForm.trailer} onChange={(e) => setMovieForm({ ...movieForm, trailer: e.target.value })} /></label>

          <div className="seat-config-box">
            <h3>Seat Layout & Ticket Categories</h3>
            <div className="admin-two-columns"><label>Rows <span>(e.g. A-F)</span><input value={movieForm.rows} onChange={(e) => setMovieForm({ ...movieForm, rows: e.target.value })} required /></label><label>Seats Per Row<input type="number" min="1" value={movieForm.seatsPerRow} onChange={(e) => setMovieForm({ ...movieForm, seatsPerRow: e.target.value })} required /></label></div>
            {movieForm.categories.map((category, index) => <div className="category-row" key={index}><input placeholder="Category" value={category.name} onChange={(e) => updateCategory(index, "name", e.target.value)} required /><input placeholder="Rows e.g. A,B" value={category.rows} onChange={(e) => updateCategory(index, "rows", e.target.value)} required /><input type="number" min="0" placeholder="Price" value={category.price} onChange={(e) => updateCategory(index, "price", e.target.value)} required /></div>)}
            <button type="button" className="small-action" onClick={() => setMovieForm({ ...movieForm, categories: [...movieForm.categories, { name: "", rows: "", price: 0 }] })}>+ Add Category</button>
          </div>
          <div className="admin-form-actions"><button className="admin-submit" type="submit"><Save size={17} /> {editing?.type === "movie" ? "Update Movie" : "Add Movie"}</button>{editing?.type === "movie" && <button type="button" className="cancel-button" onClick={resetForms}><X size={17} /> Cancel</button>}</div>
        </form>

        <form className="admin-card" onSubmit={handleTheatreSubmit}>
          <div className="admin-card-title"><Building2 size={22} /><h2>{editing?.type === "theatre" ? "Update Theatre" : "Add Theatre"}</h2></div>
          <label>Theatre Name<input value={theatreForm.name} onChange={(e) => setTheatreForm({ ...theatreForm, name: e.target.value })} required /></label>
          <label>Location<input value={theatreForm.location} onChange={(e) => setTheatreForm({ ...theatreForm, location: e.target.value })} required /></label>
          <label>City<input value={theatreForm.city} onChange={(e) => setTheatreForm({ ...theatreForm, city: e.target.value })} required /></label>
          <label>Number of Screens<input type="number" min="1" value={theatreForm.screens} onChange={(e) => setTheatreForm({ ...theatreForm, screens: e.target.value })} required /></label>
          <div className="admin-form-actions"><button className="admin-submit" type="submit"><Save size={17} /> {editing?.type === "theatre" ? "Update Theatre" : "Add Theatre"}</button>{editing?.type === "theatre" && <button type="button" className="cancel-button" onClick={resetForms}><X size={17} /> Cancel</button>}</div>
        </form>

        <form className="admin-card admin-card-wide" onSubmit={handleShowSubmit}>
          <div className="admin-card-title"><CalendarPlus size={22} /><h2>{editing?.type === "show" ? "Update Show" : "Add Show"}</h2></div>
          <div className="admin-two-columns"><label>Movie<select value={showForm.movie} onChange={(e) => setShowForm({ ...showForm, movie: e.target.value })} required><option value="">Select Movie</option>{movies.map((movie) => <option key={movie._id} value={movie._id}>{movie.title}</option>)}</select></label><label>Theatre<select value={showForm.theatre} onChange={(e) => setShowForm({ ...showForm, theatre: e.target.value })} required><option value="">Select Theatre</option>{theatres.map((theatre) => <option key={theatre._id} value={theatre._id}>{theatre.name} - {theatre.location}</option>)}</select></label></div>
          <div className="admin-three-columns"><label>Date<input type="date" min={getToday()} value={showForm.date} onChange={(e) => setShowForm({ ...showForm, date: e.target.value })} required /></label><label>Show Time<input placeholder="5:00 PM" value={showForm.time} onChange={(e) => setShowForm({ ...showForm, time: e.target.value })} required /></label><label>Screen<input type="number" min="1" value={showForm.screen} onChange={(e) => setShowForm({ ...showForm, screen: e.target.value })} required /></label></div>
          <label>Base Show Price (₹)<input type="number" min="1" value={showForm.price} onChange={(e) => setShowForm({ ...showForm, price: e.target.value })} required /></label>
          <div className="admin-form-actions"><button className="admin-submit" type="submit"><Save size={17} /> {editing?.type === "show" ? "Update Show" : "Add Show"}</button>{editing?.type === "show" && <button type="button" className="cancel-button" onClick={resetForms}><X size={17} /> Cancel</button>}</div>
        </form>
      </section>

      <section className="management-section">
        <div className="section-heading"><h2>Manage Movies</h2><span>{movies.length} records</span></div>
        <div className="management-table"><div className="table-head"><span>Movie</span><span>Seats</span><span>Categories</span><span>Actions</span></div>{movies.map((movie) => <div className="table-row" key={movie._id}><span><strong>{movie.title}</strong><small>{movie.language} • {movie.duration}</small></span><span>{movie.seating?.rows?.join(" ") || "A-F"} × {movie.seating?.seatsPerRow || 8}</span><span>{movie.seating?.categories?.map((c) => `${c.name} ₹${c.price}`).join(" • ")}</span><span className="row-actions"><button onClick={() => editMovie(movie)} title="Edit"><Edit3 size={16} /></button><button onClick={() => remove("movie", movie._id)} title="Delete"><Trash2 size={16} /></button></span></div>)}</div>
      </section>

      <section className="management-section">
        <div className="section-heading"><h2>Manage Theatres</h2><span>{theatres.length} records</span></div>
        <div className="management-table"><div className="table-head"><span>Theatre</span><span>City</span><span>Screens</span><span>Actions</span></div>{theatres.map((theatre) => <div className="table-row" key={theatre._id}><span><strong>{theatre.name}</strong><small>{theatre.location}</small></span><span>{theatre.city}</span><span>{theatre.screens}</span><span className="row-actions"><button onClick={() => editTheatre(theatre)} title="Edit"><Edit3 size={16} /></button><button onClick={() => remove("theatre", theatre._id)} title="Delete"><Trash2 size={16} /></button></span></div>)}</div>
      </section>

      <section className="management-section">
        <div className="section-heading"><h2>Manage Shows</h2><span>{shows.length} records</span></div>
        <div className="management-table"><div className="table-head"><span>Movie / Theatre</span><span>Date & Time</span><span>Screen / Price</span><span>Actions</span></div>{shows.map((show) => <div className="table-row" key={show._id}><span><strong>{show.movie?.title}</strong><small>{show.theatre?.name}</small></span><span>{new Date(show.date).toLocaleDateString("en-IN")} • {show.time}</span><span>Screen {show.screen}<br />₹{show.price}</span><span className="row-actions"><button onClick={() => editShow(show)} title="Edit"><Edit3 size={16} /></button><button onClick={() => remove("show", show._id)} title="Delete"><Trash2 size={16} /></button></span></div>)}</div>
      </section>
    </main>
  );
}

export default Admin;
