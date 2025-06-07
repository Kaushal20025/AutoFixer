from typing import List, Optional

def calculate_average(numbers: List[float]) -> float:
    """
    Calculate the average of a list of numbers.
    
    Args:
        numbers (List[float]): List of numbers to calculate average from
        
    Returns:
        float: The average of the numbers
        
    Raises:
        ValueError: If the input list is empty
    """
    if not numbers:
        raise ValueError("Cannot calculate average of empty list")
        
    total = 0
    count = len(numbers)
    
    # More efficient loop using direct iteration
    for number in numbers:
        total += number
        
    return total / count

class DataProcessor:
    """A class to process numerical data with various operations."""
    
    def __init__(self) -> None:
        """Initialize DataProcessor with an empty data list and processed flag."""
        self.data: List[float] = []
        self.processed: bool = False
    
    def add_data(self, new_data: List[float]) -> None:
        """
        Add new data to the existing data list.
        
        Args:
            new_data (List[float]): List of numbers to add
        """
        if not isinstance(new_data, list):
            raise TypeError("new_data must be a list")
        self.data.extend(new_data)
    
    def process(self) -> List[float]:
        """
        Process the data by doubling positive numbers.
        
        Returns:
            List[float]: List of processed numbers
        """
        return [x * 2 for x in self.data if x > 0]

def main() -> None:
    """Main function to demonstrate the DataProcessor functionality."""
    try:
        # Create processor instance
        processor = DataProcessor()
        
        # Test data
        test_numbers = [1.0, 2.0, 3.0, 4.0, 5.0]
        
        # Calculate and display average
        result = calculate_average(test_numbers)
        print(f"Average is: {result:.2f}")
        
        # Process data
        processor.add_data(test_numbers)
        processed_data = processor.process()
        print(f"Processed data: {processed_data}")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main() 