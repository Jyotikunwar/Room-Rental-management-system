import React, { useState } from "react";
import { Search, MapPin, DollarSign, Filter, Wifi, Car, Droplet, Sun, Utensils, Wind, Home, Sparkles } from "lucide-react";

interface HeroSearchProps {
  onSearch: (filters: Record<string, any>) => void;
}

export const HeroSearch: React.FC<HeroSearchProps> = ({ onSearch }) => {
  const [city, setCity] = useState("");
  const [roomType, setRoomType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [search, setSearch] = useState("");
  
  // Amenity booleans
  const [wifi, setWifi] = useState(false);
  const [parking, setParking] = useState(false);
  const [water, setWater] = useState(false);
  const [balcony, setBalcony] = useState(false);
  const [kitchen, setKitchen] = useState(false);
  const [ac, setAc] = useState(false);
  const [furnished, setFurnished] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedAmenities: string[] = [];
    if (wifi) selectedAmenities.push("wifi");
    if (parking) selectedAmenities.push("parking");
    if (water) selectedAmenities.push("water");
    if (balcony) selectedAmenities.push("balcony");
    if (kitchen) selectedAmenities.push("kitchen");
    if (ac) selectedAmenities.push("air conditioner");
    if (furnished) selectedAmenities.push("furnished");

    onSearch({
      city: city || undefined,
      roomType: roomType || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      search: search || undefined,
      amenities: selectedAmenities.length > 0 ? selectedAmenities.join(",") : undefined,
    });
  };

  return (
    <div className="hero-container glass-panel">
      <div className="hero-header">
        <div className="hero-badge">
          <Sparkles className="badge-icon text-amber" />
          <span>Hybrid Cosine Similarity Recommendation Engine</span>
        </div>
        <h1 className="hero-title">
          Find Your Perfect Room in <span className="gradient-text">Nepal</span>
        </h1>
        <p className="hero-subtitle">
          Intelligent multi-criteria filtering matched with content-based similarity vectors & real tenant engagement signals.
        </p>
      </div>

      {/* Multi-Criteria Search Bar */}
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-grid">
          {/* Keyword Search */}
          <div className="search-input-group">
            <Search className="input-icon" />
            <input
              type="text"
              placeholder="Search by area, title, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
            />
          </div>

          {/* City Dropdown */}
          <div className="search-input-group">
            <MapPin className="input-icon" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input-field select-field"
            >
              <option value="">All Cities (Nepal)</option>
              <option value="Kathmandu">Kathmandu</option>
              <option value="Lalitpur">Lalitpur</option>
              <option value="Bhaktapur">Bhaktapur</option>
              <option value="Pokhara">Pokhara</option>
            </select>
          </div>

          {/* Room Type */}
          <div className="search-input-group">
            <Home className="input-icon" />
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="input-field select-field"
            >
              <option value="">All Room Types</option>
              <option value="SINGLE">Single Room</option>
              <option value="DOUBLE">Double Room</option>
              <option value="FLAT">Flat</option>
              <option value="APARTMENT">Apartment</option>
            </select>
          </div>

          {/* Min Price */}
          <div className="search-input-group">
            <DollarSign className="input-icon" />
            <input
              type="number"
              placeholder="Min Price (NPR)"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Max Price */}
          <div className="search-input-group">
            <DollarSign className="input-icon" />
            <input
              type="number"
              placeholder="Max Price (NPR)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn btn-primary search-btn">
            <Search size={18} />
            <span>Search Rooms</span>
          </button>
        </div>

        {/* Toggle Advanced Amenity Filters */}
        <div className="advanced-toggle">
          <button
            type="button"
            className="btn-link"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter size={16} />
            <span>{showAdvanced ? "Hide Amenity Vector Filters" : "Filter by Amenities (Vector Feature Weights)"}</span>
          </button>
        </div>

        {/* Amenity Feature Vector Toggles */}
        {showAdvanced && (
          <div className="amenity-grid glass-card">
            <label className={`amenity-chip ${wifi ? "active" : ""}`}>
              <input type="checkbox" checked={wifi} onChange={(e) => setWifi(e.target.checked)} hidden />
              <Wifi size={16} />
              <span>WiFi</span>
            </label>

            <label className={`amenity-chip ${parking ? "active" : ""}`}>
              <input type="checkbox" checked={parking} onChange={(e) => setParking(e.target.checked)} hidden />
              <Car size={16} />
              <span>Parking</span>
            </label>

            <label className={`amenity-chip ${water ? "active" : ""}`}>
              <input type="checkbox" checked={water} onChange={(e) => setWater(e.target.checked)} hidden />
              <Droplet size={16} />
              <span>24h Water</span>
            </label>

            <label className={`amenity-chip ${balcony ? "active" : ""}`}>
              <input type="checkbox" checked={balcony} onChange={(e) => setBalcony(e.target.checked)} hidden />
              <Sun size={16} />
              <span>Balcony</span>
            </label>

            <label className={`amenity-chip ${kitchen ? "active" : ""}`}>
              <input type="checkbox" checked={kitchen} onChange={(e) => setKitchen(e.target.checked)} hidden />
              <Utensils size={16} />
              <span>Kitchen</span>
            </label>

            <label className={`amenity-chip ${ac ? "active" : ""}`}>
              <input type="checkbox" checked={ac} onChange={(e) => setAc(e.target.checked)} hidden />
              <Wind size={16} />
              <span>AC</span>
            </label>

            <label className={`amenity-chip ${furnished ? "active" : ""}`}>
              <input type="checkbox" checked={furnished} onChange={(e) => setFurnished(e.target.checked)} hidden />
              <Home size={16} />
              <span>Furnished</span>
            </label>
          </div>
        )}
      </form>
    </div>
  );
};
