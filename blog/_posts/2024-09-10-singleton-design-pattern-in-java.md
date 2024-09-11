---
layout: post
title: "Singleton Design Pattern in Java"
---

Software design patterns are there to help solve common problems which occur in software design. There are different types of design patterns which we have, each solving a different use case.

In this post, we will look at Singleton pattern, which is a creational pattern (deal with object creation mechanisms), that allows a single instance of the class to be present, and all references to that class point to a single instance which we create.

A Singleton design pattern makes sure that the class has a single instance, and provides access to that class globally.

### Why would a Singleton pattern be needed at all?

When we need to ensure that the class has only one instance and a global access to that class is required, we use the Singleton pattern. Some examples would be -

1. **Creating a Database connection pool** - A Singleton class can be used to manage a single access point to DB pool, and limit number of connections to database.

2. **Logging Service** - We can implement logging service as a Singleton to ensure that various parts of application, will log the messages through same class, and prevents inconsistencies in log file access.

3. **Configuration Management** - We can manage environment settings, API keys, global settings by storing them in a singleton class, and accessing them throughout the application, without the need to creating new instances whenever used.

### How do we implement a Singleton?

To implement a Singleton class, there are 2 steps to implement it -

1. Declare all constructors of the class as **private** so it cannot be instantiated by any other objects.
2. Provide a **static method** which can give the reference of the class instance.

### Singleton Implementation in JAVA

We will implement a very basic Lazy initialization Singleton class which will have a private constructor, and a static method to get its instance.

```java
public class Singleton {
    private static Singleton instance;

    //Private constructor
    private Singleton(){
    }

    //Lazy initialization
    public static Singleton getInstance(){
        //If not already initialized, create a new instance, else return the existing instance
        if(instance == null)
            instance = new Singleton();
        return instance;
    }
}
```

#### Usage

```java
class SingletonDemo{
    public static void main(String[] args){
        //We can refer to the instance by calling its getInstance method.
        //We don't need Singleton singleton = new Singleton(), so a single copy is used globally.
        Singleton singleton = Singleton.getInstance();
    }
}
```

This implementation looks fine, but it can have issues on a multi threaded environment, where this class could be called from 2 threads, and the following scenario would occur -

1. Thread 1 calls the **getInstance** method, the Singleton is not yet created, so a new instance is created and returned. Thread 2 calls the **getInstance** method, the Singleton class object has been created, so already created object is returned back.

2. Thread 1 and Thread 2 both call the **getInstance** method, both see that the class instance is not created, so 2 instances of the Singleton are created and returned, which is problematic.

To ensure that our Singleton class works correctly in a multi threaded environment, we use a concept known as **Double Checked Locking(DCL)**.
We synchronize the threads during creation of first Singleton object.

To make this happen, following changes should be made to the Singleton class.

- Declare the Singleton instance as **volatile**

```java
private static volatile Singleton instance
```

- While checking if instance is null, and creating a new instance, make it **synchronized**.

The complete example with thread safe DCL Singleton class is given below

```java
class DCLSingleton {
    private static volatile DCLSingleton instance;

    //Private constructor
    private DCLSingleton(){
    }

    //Lazy initialization
    public static DCLSingleton getInstance(){
        if (instance == null) { // First check (no locking)
            synchronized (Singleton.class) { // Locking
                if (instance == null) { // Second check (with locking)
                    instance = new DCLSingleton();
                }
            }
        }
        return instance;
    }
}
```

### Potential downsides of Singleton pattern

1. There could be global state issues.
2. Unit testing can be difficult as singleton have global state, so we need to mock it correctly.
3. Improper implementation of singleton can cause issues in a multi threaded environment.
