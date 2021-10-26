import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Scanner;
import java.util.Random;
import java.io.File;  
import java.io.FileNotFoundException;  

public class scheduler {
	// Instructing the constructor to ignore/suppress the warning "raw types" from List
	@SuppressWarnings("rawtypes")
	// Declaring a dictionary that will hold each day and list of people available on that day
	private Map<String,List> AvailabilityDict = new HashMap<String,List>();
	
	// Declaring a list of days
	private String[] keysList = {"Monday","Tuesday","Wednesday","Thursday","Sunday"};
	
	// The default constructor
	public scheduler() 
	{
		// Initializing the input object
		Scanner input = new Scanner(System.in);
		// Getting input from the user and filling the dictionary
		for(int i = 0; i < keysList.length; i++)
		{
			System.out.println("Who are available on " + keysList[i] + "s:");
			
			// Splitting the input and initializing it to a list
			String[] value = input.nextLine().strip().split(",");
			
			// Initializing a list of type ArrayList
			List<String> the_list = new ArrayList<String>();
			
			// Iterating over the input list and saving it to the Array List
			for(int j = 0; j < value.length; j++)
			{
				the_list.add(value[j]);
			}
			
			// Placing the given input into the Dictionary after splitting the comma separated input into a list
			AvailabilityDict.put(keysList[i], the_list); 
		}
		input.close();
	}
	
	// The constructor invoked when a File to read argument is given
	public scheduler(String filename)
	{
		try 
		{
			File myfile = new File(filename);
		    Scanner myReader = new Scanner(myfile);
		    
		    while (myReader.hasNextLine()) 
		    {
		    	String data = myReader.nextLine();
		        String[] thestaffdays = data.strip().split(":");
		        
		     // Splitting the comma separated string into the list of names
				String[] value = thestaffdays[1].strip().split(",");
				
				// Initializing a list of type ArrayList
				List<String> the_list = new ArrayList<String>();
				
				// Iterating over the input list and saving it to the Array List
				for(int j = 0; j < value.length; j++)
				{
					the_list.add(value[j]);
				}
				// Placing the obtained data into the Dictionary after splitting the comma separated input into a list
				AvailabilityDict.put(thestaffdays[0].strip() , the_list);
		    }
		    myReader.close();
		} 
		catch (FileNotFoundException e) 
		{
		    System.out.println("An error occurred in reading the file.");
		    e.printStackTrace();
		}
	}
	
	
	public void showDay(String day)
	{
		System.out.println(AvailabilityDict.get(day));
	}
	
	// The method to generate the schedule
	public void generateSchedule()
	{
		@SuppressWarnings("rawtypes")
		Map<String,List> scheduleDict = new HashMap<String,List>();
		int maxnumber_of_staff = 11;
		
		
		Random rand_num = new Random();
		int random;
		
		
		
		// Looping through the dictionary and filling it with empty lists
		for(int i = 0; i < keysList.length; i++)
		{
			List<String> temp_list = new ArrayList<String>();
			// Placing the given input into the Dictionary after splitting the comma separated input into a list
			scheduleDict.put(keysList[i], temp_list); 
		}
		
		// Looping through each day
		for(int i = 0; i < keysList.length; i++)
		{
			Map<Integer,Boolean> Indices = new HashMap<Integer,Boolean>();
			
			for(int j = 0; j < AvailabilityDict.get(keysList[i]).size(); j++)
			{
				Indices.put(j, true);
			}
			
			while( scheduleDict.get(keysList[i]).size() < maxnumber_of_staff )
			{
				
				random = rand_num.nextInt(AvailabilityDict.get(keysList[i]).size());
				
				if(Indices.get(random))
				{
					scheduleDict.get(keysList[i]).add(AvailabilityDict.get(keysList[i]).get(random));
					Indices.put(random, false);
				}
				
			}
			System.out.println("\nThe following will work on " + keysList[i] + ": "+ scheduleDict.get(keysList[i]));
		}
		
		//for(int i = 0; i < keysList.length; i++)
		//{
			//System.out.println("\nThe following will work on " + keysList[i] + ": "+ scheduleDict.get(keysList[i]));
		//}
	}
	
	public static void main(String[] args)
	{
		//daynamer e = new daynamer("25/10/2021");
		//System.out.println(e.determineDay());
		scheduler e = new scheduler("aval.txt");
		e.generateSchedule();
	}
}
