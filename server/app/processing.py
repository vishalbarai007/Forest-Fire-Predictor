import pandas as pd
import xarray as xr


def get_schema_from_dataframe(df: pd.DataFrame) -> str:
    """Extracts a readable schema from a Pandas DataFrame for the LLM."""
    # This is a common way to capture the output of df.info()
    import io

    buffer = io.StringIO()
    df.info(buf=buffer)
    return buffer.getvalue()


def nc_to_dataframe(ds: xr.Dataset) -> pd.DataFrame:
    """
    Converts any NetCDF xarray dataset into a flattened Pandas DataFrame.
    """
    # This robustly converts the dataset to a dataframe, making columns from coordinates.
    df = ds.to_dataframe().reset_index()
    # MODIFIED: Removed .dropna() to allow rows with missing values.
    return df
