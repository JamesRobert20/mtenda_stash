import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class InputChecker {
	private String[] the_date_list;
	private String the_date_string;
	private Map<Integer,String> months = new HashMap<Integer,String>();
	private ArrayList<Integer> small_months;
	private String[] month_names = {"January","February","March","April","May","June","July","August","September","October","November","December"};
	private boolean the_boolean = true;
	private int date;
	private int month;
	private int year;
	

	public InputChecker(String date_string)
	{
		int month_number = 1;
		the_date_string = date_string.substring(0);
		//Splitting the input to get a list with the date,month and year 
		the_date_list = the_date_string.split("/");
		
		small_months = new ArrayList<Integer>();
		for(int z = 2; z < 13; z = z + 2)
		{
			if(z == 8)
				z++;
			small_months.add(z);
		}
		for(String month_name : month_names)
		{
			months.put(month_number,month_name);
			month_number++;
		}
	}
			
	public boolean checkListLength()
	{
		//If the list does not have three elements then the date was of invalid format
		if(the_date_list.length != 3)
		{
			System.out.println('"' + the_date_string + '"' + " is an invalid date or format");
			the_boolean = false;
		}
		return the_boolean;	
	}		
		
	public boolean areNumbers()
	{
		int checker = 0;
		try
		{
			Integer.parseInt(the_date_list[0]);
			checker = 1;
			Integer.parseInt(the_date_list[1]);
			checker = 2;
			Integer.parseInt(the_date_list[2]);
		}
		catch(NumberFormatException e)
		{
			if(checker == 0)
			{
				System.out.println('"' + the_date_list[0] + '"' + " is not a number");
			}
			else if(checker == 1)
			{
				System.out.println('"' + the_date_list[1] + '"' + " is not a number");
			}
			else 
			{
				System.out.println('"' + the_date_list[2] + '"' + " is not a number");
			}
			the_boolean = false;
		}
		return the_boolean;
	}
	
	public boolean DateIsValid()
	{		
		date = Integer.parseInt(the_date_list[0]);
		month = Integer.parseInt(the_date_list[1]);
		year = Integer.parseInt(the_date_list[2]);
		
		
		if(date <= 0 || date > 31)
		{
			System.out.println('"' + String.valueOf(date) + '"' + " is an invalid date!. The Date should be a number between 1 and 31");
			the_boolean = false;
		}
		if(month <= 0 || month > 12)
		{
			System.out.println('"' + String.valueOf(month) + '"' + " is an invalid month!. The Month should be a number between 1 and 31");
			the_boolean = false;
		}
		if (year < 0)
		{
			System.out.println("The year can't be negative");
			the_boolean = false;
		}
		return the_boolean;
	}
	
	public boolean Monthdays()
	{		
		if(date == 31 && small_months.contains(month))
		{
			System.out.println(months.get(month) + " does not have a " + '"' + String.valueOf(date) + '"' + " date");
			the_boolean = false;
		}
		
		else if(months.get(month) == "February" && date == 30)
		{
			System.out.println("February does not have a " + '"' + "30" + '"' + "date");
			the_boolean = false;
		}
		
		else if( months.get(month) == "February" && ( (year % 4 == 0) && date > 29 || (year % 4 != 0) && date > 28) )
		{
			System.out.println("The Febuary of year " + '"' + String.valueOf(year) + '"' + " does not have a " + '"' + String.valueOf(date) + '"' + " date");
			the_boolean = false;
		}
		return the_boolean;
	}
	
	public boolean inputIsCorrect()
	{
		boolean value = false;
		
		if(this.checkListLength())
		{
			if(this.areNumbers())
			{
				if(this.DateIsValid())
				{
					if(this.Monthdays())
					{
						value = true;
					}
				}
			}
		}
		return value;
	}
	
	public ArrayList<Integer> getSmall_months()
	{
		return new ArrayList<Integer>(small_months);
	}
	
	public int getDate()
	{
		return this.date;
	}
	
	public int getMonth()
	{
		return this.month;
	}
	
	public int getYear()
	{
		return this.year;
	}
	
	public Map<Integer, String> getMonths() {
		return new HashMap(months);
	}
}
