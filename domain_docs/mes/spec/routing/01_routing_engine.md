# Routing Engine Design & Configuration

## 1. Routing Engine Overview

The **Routing Engine** is designed to manage the production routing process, determining the sequence of operations (steps) that a unit will go through. It uses predefined routing definitions to manage product flow across stations and operations. This configuration allows flexibility for different production environments.

## 2. Key Concepts

* **Routing**: A set of operations that define the sequence of steps for manufacturing a product.
* **RoutingStep**: Defines an operation in a routing, which is assigned to a specific station and includes the step number.
* **StationType**: Defines how a particular operation will be executed (e.g., Manual, Automatic, Batch, Test).
* **Operation**: Represents a specific process or task performed during a step, e.g., "soldering," "inspection."

## 3. Routing Structure

* **Routing**: A collection of steps in a specific order. Each routing represents the sequence of steps required for a particular product.
* **RoutingStep**: Each step has an associated operation, station, and step number. For example:
  * **Step 1**: Station 1, Operation: "Soldering," Step No: 1
  * **Step 2**: Station 2, Operation: "Inspection," Step No: 2

## 4. Routing Engine Configuration

### 4.1 Routing Definitions
* Configure routings per product type (e.g., for PCBA, SMT, etc.)
* Set up a list of steps and their corresponding operations.
* Specify station types for each step, such as MANUAL or AUTO.
* Each step may have additional configuration for quality checks or data collection.

### 4.2 Sample Configuration
```json
{
  "routingCode": "PCBA_STD_V1",
  "steps": [
    {
      "stepNo": 1,
      "operation": "Soldering",
      "stationType": "MANUAL",
      "requiresFAI": true
    },
    {
      "stepNo": 2,
      "operation": "Inspection",
      "stationType": "AUTO",
      "requiresFAI": false
    }
  ]
}
```

### 4.3 Routing Execution
* **TrackOut**: A step completion triggers the transition to the next routing step.
* **Error Handling**: If a step fails (e.g., quality check fails), the system should handle the error gracefully, providing clear guidance on the next steps.
* **Station Matching**: TrackIn/Out must validate `stationType` and (when configured) `stationGroupId` against the current `RoutingStep`.
