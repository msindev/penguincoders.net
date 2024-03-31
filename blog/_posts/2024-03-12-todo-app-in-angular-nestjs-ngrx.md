---
layout: post
title: "Creating a ToDo App with Angular, NestJS, and NgRx in a Nx Monorepo"
---

In this post, we will be creating a fully functional ToDo application in a Nx monorepo, using Angular for Frontend and NestJs for Backend. The ToDo app will also provide Angular's state management using NgRx. Our frontend app will be using Tailwind to style our components.

Let's proceed to setting up our project.

### Step 1: Set Up Nx MonoRepo with Angular and NestJS

- Create a new Nx workspace using latest Nx version `npx create-nx-workspace@latest` and follow the on-screen instructions by choosing Angular project. Your end result should look something like this ![Nx MonoRepo Generation Terminal Window](/assets/images/2024-03-12-todo-app-in-angular-nestjs-ngrx/nx-monorepo-generation-screen.png)

- Now, add NestJs to your monorepo in your monorepo's directory using `nx add @nx/nest`

- Create a new NestJs app which will keep our backend APIs in the monorepo using `nx g @nx/nest:app apps/api --frontendProject todo` which will generate 2 folders **api** and **api-e2e**. Our APIs will be present in the _apps/api_ folder. It will also add a `proxy.conf.json` in the _apps/todo_ folder.

- After the frontend and api apps have been installed, the folder strcuture should look something like below ![Application Folder Structure](/assets/images/2024-03-12-todo-app-in-angular-nestjs-ngrx/nx-api-frontend-folder-structure.png)

---

### Step 2 - Create APIs in NestJS App

We will be creating a in-memory database to store our ToDos. So we are not using any external databases, but the code can be modified to support your databases as well. We will also use OpenAPI to display the API documentation.

- Install the Swagger dependency through `npm install --save @nestjs/swagger`

- After your dependencies have been installed, add the Swagger configuration to your _apps/api/src/main.ts_ file. Below is the _main.ts_ file after adding configuration.

```ts
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = "api";
  app.setGlobalPrefix(globalPrefix);
  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle("Todo API")
    .setDescription("API documentation for Todo application")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
```

<br/>
- You should now have OpenAPI empty documentation ready. To view the Swagger docs in your broswer, start the API server using `nx serve api` and browse to <http://localhost:3000/api> and you should see the below image ![Empty Swagger API Documentation](/assets/images/2024-03-12-todo-app-in-angular-nestjs-ngrx/empty-swagger-nestjs.png)

- Let's write the API services and controllers. Before that, we will add a new library which will hold our models and interfaces for our ToDo object. Generate a new library in Nx workspace using the command `nx g @nx/js:library --name=types --bundler=none --directory=libs/types --projectNameAndRootFormat=as-provided` or use the Nx Console to generate a `@nx/js` library.

- In the newly generated lib, go to `libs/types/src/lib/types.ts` file and add the DTOs and model for our ToDo object.

```ts
import { ApiProperty } from "@nestjs/swagger";

export class ToDoDto {
  @ApiProperty({ description: "Task" })
  task!: string;
}

export interface ToDo extends ToDoDto {
  id: string;
  done: boolean;
}
```

> The **ToDoDto** is used to transfer via REST, and **ToDo** interface stores additional properites indicating id and status.

<br/>
- Once your _types_ lib is ready, we can move to writing our service. For sake of simplicity in this tutorial, I will not be using any Database and will be creating the Tasks in-memory.

**File**: `apps/api/src/app/app.service.ts`

```ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { ToDo, ToDoDto } from "@nx-todo-app/types";

@Injectable()
export class AppService {
  todos: ToDo[] = [];

  getAllToDos() {
    return this.todos;
  }

  addToDo(todoDto: ToDoDto) {
    const todo: ToDo = { id: String(Date.now()), done: false, ...todoDto };
    this.todos.push(todo);
    return { message: "ToDo successfully added" };
  }

  getActiveToDos() {
    return this.todos.filter((todo) => !todo.done);
  }

  getCompletedToDos() {
    return this.todos.filter((todo) => todo.done);
  }

  updateToDo(id: string, done: boolean) {
    const todo = this.todos.find((todo) => todo.id === id);
    if (todo) {
      todo.done = done ?? todo.done;
      return { message: `ToDo with ID ${id} updated successfully` };
    } else {
      throw new NotFoundException(`ToDo with ID ${id} not found`);
    }
  }

  deleteToDo(id: string) {
    const todoIndex = this.todos.findIndex((todo) => todo.id === id);
    if (todoIndex === -1) {
      throw new NotFoundException(`ToDo with ID ${id} not found`);
    }
    this.todos.splice(todoIndex, 1);
    return { message: `ToDo with ID ${id} deleted successfully` };
  }
}
```

> The **todos** array holds our tasks in memory. Standard CRUD(Create, Read, Update and Delete) functions have been written which are self explanatory.
> <br/> (Please put in comments if something is unclear).

- The next step is to write the API Controllers to access this service. We will write the following REST Functions (GET, PUT, POST, DELETE).

**File**: `apps/api/src/app/app.controller.ts`

```ts
@ApiTags("tasks")
@Controller("/v1/tasks")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "Get all ToDos" })
  @ApiResponse({
    status: 200,
    description: "Returns an array of ToDos",
    isArray: true,
  })
  getAllToDos() {
    return this.appService.getAllToDos();
  }

  @Post()
  @ApiOperation({ summary: "Add a new ToDo" })
  @ApiBody({ type: ToDoDto })
  @ApiResponse({ status: 201, description: "ToDo successfully added" })
  addToDo(@Body() todo: ToDoDto) {
    return this.appService.addToDo(todo);
  }

  @Put(":id/done")
  @ApiOperation({ summary: "Update the status of a ToDo" })
  @ApiParam({ name: "id", description: "ToDo ID" })
  @ApiBody({ schema: { properties: { done: { type: "boolean" } } } })
  @ApiResponse({ status: 200, description: "ToDo updated successfully" })
  updateStatus(@Param("id") id: string, @Body("done") done: boolean) {
    return this.appService.updateToDo(id, done);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a ToDo" })
  @ApiParam({ name: "id", description: "ToDo ID" })
  @ApiResponse({ status: 200, description: "ToDo deleted successfully" })
  deleteToDo(@Param("id") id: string) {
    return this.appService.deleteToDo(id);
  }
}
```

<br/>

- Run `nx serve api` and browse to <http://localhost:3000/api>, and you should have all the APIs ready. Go and Try it yourself using cURL or Postman. The OpenAPI Schema should look like ![Swagger API Documentation](/assets/images/2024-03-12-todo-app-in-angular-nestjs-ngrx/swagger-with-apis-nestjs.png)

---

### Step 3 - Generate OpenAPI Services for Angular

You might ask, why we cannot write our own HttpService in Angular. Sure, we can! But why to do it manually when we have an awesome _**OpenAPI Generator CLI**_ tool available.

- Install the OpenAPI Generator by - `npm install @openapitools/openapi-generator-cli -g`. This will globally install the openapi-generator-cli in your machine.

- We will create a new library to hold our OpenAPI generated services. Create a new lib using `nx g @nx/js:library --name=openapi-generated --bundler=none --directory=libs/openapi-generated --projectNameAndRootFormat=as-provided` and delete the 2 files **openapi_generated.ts** and **openapi_generated.spec.ts**

- Next, we will run the command to populate our Typescript client service - `npx @openapitools/openapi-generator-cli generate -i http://localhost:3000/api-json --generator-name typescript-angular -o libs/openapi-generated/src/lib --additional-properties=useSingleRequestParameter=true`. This wil generate a bunch of files including **model** and **api**. You can browse to see the ToDoDto model among others and the todo service file generated.

  > Make sure your NestJS server is up and running, and then exceute this command. It picks up the OpenApi Spec from **http://localhost:3000/api-json**.

- You should have the following openapi-generated library as shown in below picture. ![OpenAPI Generated Client Library](/assets/images/2024-03-12-todo-app-in-angular-nestjs-ngrx/openapi-generated-typescript.png)

- One final step, update the `libs/openapi-generated/src/index.ts` file to include our APIs.

```ts
export * from "./lib/api/api"; //This will allow the APIs to be exposed.
```

<br/>

We have completed coding our backend, and will move now to code our UI in Angular. ![Success GIPHY Meme](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExam1lc3RtZ3hkb2x6Y3NhcW8wYnQ4eGlvZzhsNnZ3c2Jvcm16Ym45aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/a0h7sAqON67nO/giphy.gif)

<br/>

---
