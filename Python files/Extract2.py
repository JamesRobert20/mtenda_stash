# Necessary imports
import os
import pandas as pd

# Array of all available Cores
Core_names = []


# A function to read the file and store data in Lists
def readFile(filePath, extractChars):
    
    # Opening the file using its path
    # encoding = "unicode_escape" solved the error "UnicodeDecodeError: 'utf-8' codec can't decode byte 0xb0 in position 230187: invalid start byte"
    file = pd.read_csv(filePath, encoding='unicode_escape')

    needed_data = file.loc[(file['HOLE_NUMBER'] == extractChars)]

    return needed_data


# A function to write to a csv file the needed data
def writeFile(dataToWrite, dest_directory_file):

    # Opening the file to write to
    dataToWrite.to_csv(dest_directory_file, index=False)


# Getting all core names
def getAllCores(filepath, Core_names):

    # Open file
    # encoding = "unicode_escape" solved the error "UnicodeDecodeError: 'utf-8' codec can't decode byte 0xb0 in position 230187: invalid start byte"
    file = pd.read_csv(filepath, encoding='unicode_escape')

    # Storing the data into a dictionary (Keys are the Column names, Value are List of items in the column)
    Dict_allData = file.to_dict(orient='list')

    # Getting the List of items in the specified column
    cores_column = Dict_allData["HOLE_NUMBER"]

    for core in cores_column:
        if not (core in Core_names):
            Core_names.append(core)
            
    return Core_names


# Getting all core names (This function is not very accurate!)
def getAllCores2(filepath, Core_names):
    
    # Open file
    file = open(filepath,"r")

    # List of all rows read from the file(excluding the header row)
    all_rows = file.readlines()[1:]
        
    for row in all_rows:
        
        coreName = row.strip().split(",")[0]
        
        # Add it to the list if not already present
        if (not coreName in Core_names) and coreName[0:4] == "KLUB":
            Core_names.append(coreName)

            
    return Core_names
    
    
the_directory = r'C:\Users\jmtendamema\Desktop\CODE\DOCS\CSV from logs\CSV from logs'

# A List of all items in the given directory
allFiles = os.listdir(the_directory)

# Looping through the items in the directory
for theFile in allFiles:
    
    Core_names = getAllCores("C:/Users/jmtendamema/Desktop/CODE/DOCS/CSV from logs/CSV from logs/" + theFile, Core_names)

for Core in Core_names:
    core_directory = "C:/Users/jmtendamema/Desktop/CODE/DOCS/CSV from logs/CSV from logs/" + Core

    # Create the specified directory
    os.makedirs(core_directory)

    for file in allFiles:

        extracted_data = readFile("C:/Users/jmtendamema/Desktop/CODE/DOCS/CSV from logs/CSV from logs/" + file, Core)

        writeFile(extracted_data, core_directory + '/' + file)
        
        
    
    
   
    

