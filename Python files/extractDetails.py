# Importing the system library
import sys

# Importing the csv library
# import csv


# A function to read the file and store data in Lists
def readFile(filePath, extractChars):
    
    # Opening the file using its path
    file = open(filePath,"r")

    # A 2D List of all rows from the read file
    all_rows = file.readlines()
    
    # Getting the header 
    header = all_rows[0].strip()
    
    # A new 2D List to contain only the needed rows
    needed_rows = []

    # Looping through all the rows
    for row in all_rows:
        
        # If the name in the first column matches the one we are seeking then the row is appended to needed rows
        if row.strip().split(",")[0] == extractChars:
            needed_rows.append(row)

    file.close()
    
    # Return the header and List of needed rows
    return header, needed_rows


# A function to write to a csv file the needed data
def writeFile(header, dataToWrite, filename):

    # Creating the name of the file to be written
    newName = filename[:-4] + "(extracted).csv"

    # Opening the file to write to
    file = open("C:/Users/jmtendamema/Desktop/CODE/DOCS/" + newName,"w")

    # Writing the header to the file
    file.write(header + '\n')

    # Looping through the rows and writing the data to the file
    for row in dataToWrite:
        file.write(row)
        
    file.close()


# A function to carry out the extraction process(reading and writing needed data to  file)
def extractProcess(filename, extractWord):

    # Creating the path of the file
    path = "C:/Users/jmtendamema/Desktop/CODE/DOCS/" + filename

    # Calling the read function to read file and obtain header and extracted rows
    header, rows = readFile(path,extractWord)

    # Calling the write function to write the extracted info to file
    writeFile(header, rows, filename)


# The main function
def main():

    # If the user provides just the name of the module then user is prompted for name of file and word to be extracted
    if len(sys.argv) == 1:

        filename = input("Enter the file name: ")

        extractWord = input("Enter the Core name to extract details for: ")

        extractProcess(filename, extractWord)
        
    # If user provides module and file name, extract word is prompted
    elif len(sys.argv) == 2:
        extractWord = input("Enter the Core name to extract details for: ")

        extractProcess(sys.argv[1], extractWord)

    # Otherwise the user has entered at least 3 arguments(Extra arguments are ignored)
    else:
        extractProcess(sys.argv[1], sys.argv[2])

main()











