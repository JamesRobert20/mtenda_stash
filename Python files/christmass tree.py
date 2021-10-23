# Here's a simple Christmass tree made of stars
# The algorithm here is that we print a number of spaces and stars depending on which line we are on
# The number of stars on any given line are given by the formula:
# Number of stars = 2n - 1
# where n, is the current line 


# Prompting user for the height of the tree
height = int(input("Enter height: "))

print("\n!!! Here is your Christmass tree !!!\n")
#Iterating over each line and printing the stars to create the tree
for i in range(1, height + 1):
    row = ( (height - i) * ' ' ) + ( (2 * i - 1) * "*" )
    print(row) 
