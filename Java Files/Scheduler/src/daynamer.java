import java.util.*;
public class daynamer {
	private String dategiven;
	
	public daynamer(String theDate)
	{
		dategiven = theDate;
	}
	
	public static String dayName(int counter)
	{
		String day;
		
		if(counter % 7 == 0)
			day = "Saturday";
		else if(counter % 7 == 1)
			day = "Sunday";
		else if(counter % 7 == 2)
			day = "Monday";
		else if(counter % 7 == 3)
			day = "Tuesday";
		else if (counter % 7 == 4)
			day = "Wednesday";
		else if(counter % 7 == 5)
			day = "Thursday";
		else
		{
			day = "Friday";
		}
		return day;
	}
	
	public String getDategiven() {
		return dategiven;
	}
	
	
	public String determineDay() {
		String output = "";
			
			InputChecker e = new InputChecker(getDategiven());
				
			if(e.inputIsCorrect())
			{
				int day_counter = 0;
					
				for(int i = 1; i < e.getYear(); i++)
				{
					if(i % 4 == 0)
					{
						day_counter = day_counter + 366;
					}
					else
					{
						day_counter = day_counter + 365;
					}
				}
			
				for(int j = 1; j < e.getMonth(); j++)
				{
						
					if(!e.getSmall_months().contains(j))
					{
						day_counter = day_counter + 31;
					}
					else
					{
						if(e.getMonths().get(j) == "February")
						{
								if(e.getYear() % 4 == 0)
									day_counter = day_counter + 29; 
								else
								{
									day_counter = day_counter + 28;
								}
						}
						else
						{
							day_counter = day_counter + 30;
						}
					}
				}
					
				day_counter = day_counter + e.getDate();
				String the_day = dayName(day_counter);
				output = the_day;
			}
			
		return output;
			
	}

	

}
