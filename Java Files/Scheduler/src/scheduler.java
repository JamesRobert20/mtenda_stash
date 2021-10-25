import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Scanner;

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
	
	public void showDict()
	{
		System.out.println(AvailabilityDict.get("Tuesday"));
	}
	
	public static void main(String[] args)
	{
		//daynamer e = new daynamer("25/10/2021");
		//System.out.println(e.determineDay());
		//scheduler e = new scheduler();
		//e.showDict();
	}
}
