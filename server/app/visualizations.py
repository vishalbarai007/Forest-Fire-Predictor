import pandas as pd
import folium


def map_html(df: pd.DataFrame):
    """Generates an HTML map of filtered float locations using Folium."""
    if df.empty:
        return "<h3>No data available to display on map.</h3>"

    unique_locations = df.drop_duplicates(subset=["latitude", "longitude"])
    if unique_locations.empty:
        return "<h3>No unique locations to display on map.</h3>"

    center_lat = unique_locations["latitude"].mean()
    center_lon = unique_locations["longitude"].mean()
    m = folium.Map(location=[center_lat, center_lon], zoom_start=3)

    for _, row in unique_locations.iterrows():
        popup_text = f"Lat: {row['latitude']:.2f}, Lon: {row['longitude']:.2f}"
        folium.CircleMarker(
            [row["latitude"], row["longitude"]],
            radius=5,
            color="blue",
            fill=True,
            fill_color="blue",
            popup=popup_text,
        ).add_to(m)

    return m._repr_html_()
