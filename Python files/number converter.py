# A Python program that converts numbers from one base to another
condition1 = True
dictionary1 = {10:"A",11:"B",12:"C",13:"D",14:"E",15:"F"}
dictionary2 = {"A":10,"B":11,"C":12,"D":13,"E":14,"F":15}

def fromBaseTen(new_num,base):
    dividing = True
    new_val = ""
    quotient = new_num // base
    remainder = new_num % base
    while dividing:
        if quotient == 0:
            dividing = False
        if remainder in dictionary1.keys():
            new_val = dictionary1[remainder] + new_val
        else:
            new_val = str(int(remainder)) + new_val

        remainder = quotient % base
        quotient = quotient // base
            
    return new_val
    

def fromOtherBase(num,base):
    num_length = len(num)
    power = 0
    new_num = 0
    for position in range(num_length - 1,-1,-1):
        if num[position].upper() in dictionary1.values():
            new_val = (base ** power) * dictionary2[num[position].upper()]
        else:
            new_val = (base ** power) * int(num[position])
            
        power += 1
        new_num += new_val
        
    return new_num

def main(the_number,base):
    new_num = fromOtherBase(the_number,base)
    new_base = int(input("What base do you wish to convert it into? "))
    result = fromBaseTen(new_num,new_base)
    print(the_number,"in base",base,"is equal to",result,"in base",new_base)

    condition2 = True
    while condition2:
        choice = input('\nDo you wish to convert the result to another base form?(yes/no): ')
        if choice.lower() == 'yes':
            base_new = int(input('Enter the base:'))
            next_num = fromOtherBase(result,new_base)
            new_result = fromBaseTen(next_num,base_new)
            print(result,"in base",new_base,"is equal to",new_result,"in base",base_new)
            result = new_result
            new_base = base_new
            
        elif choice.lower() == 'no':
            condition3 = True
            while condition3:
                anr = input('\nDo you want to start over the convertion?(yes/no): ')
            
                if anr.lower() == 'yes':
                    condition3 = False
                    condition2 = False
                
                elif anr.lower() == 'no':
                    print('Thank you,Have a nice day!')
                    condition3 = False
                    condition2 = False
                    global condition1
                    condition1 = False
                
                else:
                    print("Sorry the answer you entered isn't among the choices")
                
        else:
            print("Sorry the answer you entered isn't among the choices")
        
print('Welcome!,This is a number converter\n')
while condition1:
    the_number = input("Enter your number(You can enter hexadecimal notation as well eg. 0x..... ): ")

    if "0x" in the_number:
        base = 16
        main(the_number[2:],base)

    else:
        base = int(input("What base is this number in? "))
        main(the_number,base)
        
