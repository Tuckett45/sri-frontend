export interface CityScorecard {
  id?: string;
  city?: string;
  forecastedHHP?: number;
  actualHHP?: number;
  percentChangeHHP?: number;
  forecastedDollarPerHHP?: number;
  actualDollarPerHHP?: number;
  percentChangeDollarPerHHP?: number;
  forecastedDollarPerLFT?: number;
  actualDollarPerLFT?: number;
  percentChangeDollarPerLFT?: number;
  forecastedAllIn?: number;
  actualAllIn?: number;
  percentChangeAllIn?: number;
  ta_Date?: string;
  compDate?: string;
  closedDate?: string;
}
