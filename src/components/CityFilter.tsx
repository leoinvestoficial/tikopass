import { CITIES, CATEGORIES } from "@/data/mock-data";

interface CityFilterProps {
  selectedCity: string;
  onCityChange: (city: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CityFilter({
  selectedCity,
  onCityChange,
  selectedCategory,
  onCategoryChange,
}: CityFilterProps) {
  return (
    <div className="space-y-4">
      {/* Cities */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cidade</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCityChange("")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
              selectedCity === ""
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Todas
          </button>
          {CITIES.map((city) => (
            <button
              key={city}
              onClick={() => onCityChange(city)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
                selectedCity === city
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categoria</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategoryChange("")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
              selectedCategory === ""
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Todas
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
