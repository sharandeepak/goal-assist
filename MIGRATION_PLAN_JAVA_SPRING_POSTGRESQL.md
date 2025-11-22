# Migration Plan: Firebase to Java Spring Boot + PostgreSQL

## Executive Summary

This document outlines a comprehensive, phased migration plan to transition the Goal Assist application from a Firebase backend to a Java Spring Boot microservice architecture with PostgreSQL database. The migration is designed to minimize downtime, maintain data integrity, and provide a scalable, maintainable backend infrastructure.

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Target Architecture](#2-target-architecture)
3. [Migration Strategy](#3-migration-strategy)
4. [Phase-by-Phase Implementation](#4-phase-by-phase-implementation)
5. [Data Migration Strategy](#5-data-migration-strategy)
6. [API Design](#6-api-design)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Deployment Strategy](#8-deployment-strategy)
9. [Testing Strategy](#9-testing-strategy)
10. [Rollback Plan](#10-rollback-plan)
11. [Timeline & Resource Allocation](#11-timeline--resource-allocation)
12. [Risk Assessment & Mitigation](#12-risk-assessment--mitigation)

---

## 1. Current Architecture Analysis

### 1.1 Current Stack
- **Frontend**: Next.js 15 (React) with TypeScript
- **Backend**: Firebase (Firestore, Functions)
- **Database**: Firestore (NoSQL document database)
- **Authentication**: Firebase Auth
- **Hosting**: Static export to Firebase Hosting

### 1.2 Current Data Models

#### Collections in Firestore:
1. **tasks** - Core task management
   - Fields: id, title, completed, createdAt, date, priority, urgency, tags, userId, milestoneId
   
2. **milestones** - Project milestones
   - Fields: id, title, description, progress, urgency, status, startDate, endDate, tasks, userId
   
3. **satisfactionLogs** - Daily satisfaction tracking
   - Fields: id, date, score, notes, userId
   
4. **standupLogs** - Daily standup entries
   - Fields: id, date, completed, blockers, planned, notes, userId
   
5. **timeEntries** - Time tracking
   - Fields: id, userId, taskId, taskTitleSnapshot, emoji, milestoneIdSnapshot, tagsSnapshot, note, source, startedAt, endedAt, durationSec, day, createdAt, updatedAt

### 1.3 Current Services (Frontend)
- `taskService.ts` - Task CRUD operations
- `matrixService.ts` - Eisenhower Matrix logic
- `milestoneService.ts` - Milestone management
- `satisfactionService.ts` - Satisfaction tracking
- `standupService.ts` - Standup log management
- `timeService.ts` - Time entry management
- `unifiedTaskService.ts` - Unified task operations

### 1.4 Current Firebase Functions
Located in `/functions/`:
- Limited server-side logic
- Primarily used for scheduled tasks or complex queries

---

## 2. Target Architecture

### 2.1 Technology Stack

#### Backend
- **Framework**: Spring Boot 3.2+ (Java 17+)
- **Database**: PostgreSQL 15+
- **ORM**: Spring Data JPA (Hibernate)
- **API**: RESTful API (Spring MVC) + WebSocket (for real-time features)
- **Authentication**: Spring Security + JWT
- **Caching**: Redis (optional, for performance)
- **Search**: Elasticsearch (optional, for advanced search)

#### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Kubernetes (or Docker Compose for simpler deployments)
- **CI/CD**: GitHub Actions / GitLab CI
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)

### 2.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
│              Next.js 15 (React + TypeScript)                 │
│                   Port: 3000                                 │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST + WebSocket
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   API Gateway (Optional)                     │
│              Spring Cloud Gateway / NGINX                    │
│                   Port: 8080                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
┌───────▼──────────┐           ┌──────────▼─────────┐
│  Auth Service    │           │  Core API Service  │
│  Spring Boot     │           │   Spring Boot      │
│  Port: 8081      │           │   Port: 8082       │
│                  │           │                    │
│ - User Auth      │           │ - Task Management  │
│ - JWT Generation │           │ - Milestones       │
│ - Session Mgmt   │           │ - Time Tracking    │
└────────┬─────────┘           │ - Satisfaction     │
         │                     │ - Standup Logs     │
         │                     └──────────┬─────────┘
         │                                │
         │      ┌─────────────────────────┘
         │      │
┌────────▼──────▼─────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│                        Port: 5432                            │
│                                                              │
│  Schemas:                                                    │
│  - public (core tables)                                      │
│  - audit (audit logs)                                        │
│                                                              │
│  Tables:                                                     │
│  - users, tasks, milestones, time_entries,                   │
│    satisfaction_logs, standup_logs, tags                     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                     Supporting Services                       │
├──────────────────────────────────────────────────────────────┤
│  Redis (Cache) - Port: 6379                                  │
│  Elasticsearch (Search) - Port: 9200                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Migration Strategy

### 3.1 Migration Approach: **Strangler Fig Pattern**

We'll use the Strangler Fig pattern to gradually replace Firebase with Spring Boot:
1. Build new Spring Boot services alongside Firebase
2. Migrate features incrementally
3. Route traffic progressively to new services
4. Decommission Firebase components once fully migrated

### 3.2 Dual-Write Strategy (Transition Period)

During migration:
- Write to both Firebase and PostgreSQL
- Read from Firebase (primary) with PostgreSQL fallback
- Validate data consistency between systems
- Gradually flip read traffic to PostgreSQL

### 3.3 Feature Flags

Implement feature flags to control:
- Which backend to read from (Firebase vs Spring Boot)
- Enable/disable new features
- A/B testing during migration

---

## 4. Phase-by-Phase Implementation

### **Phase 0: Pre-Migration Setup** (Weeks 1-2)

#### Objectives:
- Set up development environment
- Establish CI/CD pipelines
- Create project structure

#### Deliverables:
1. **Spring Boot Project Initialization**
   ```bash
   spring init --dependencies=web,data-jpa,postgresql,security,validation,actuator \
                --build=maven \
                --java-version=17 \
                --group=com.goalassist \
                --artifact=backend-api \
                backend-api
   ```

2. **PostgreSQL Setup**
   - Docker Compose configuration
   - Initial schema design
   - Connection pooling (HikariCP)

3. **Project Structure**
   ```
   backend-api/
   ├── src/
   │   ├── main/
   │   │   ├── java/com/goalassist/
   │   │   │   ├── config/          # Security, DB, CORS configs
   │   │   │   ├── controller/      # REST controllers
   │   │   │   ├── service/         # Business logic
   │   │   │   ├── repository/      # JPA repositories
   │   │   │   ├── model/           # Entities
   │   │   │   ├── dto/             # Data Transfer Objects
   │   │   │   ├── mapper/          # DTO <-> Entity mappers
   │   │   │   ├── exception/       # Custom exceptions
   │   │   │   ├── security/        # Auth filters, JWT utils
   │   │   │   └── util/            # Utility classes
   │   │   └── resources/
   │   │       ├── application.yml
   │   │       ├── application-dev.yml
   │   │       ├── application-prod.yml
   │   │       └── db/migration/    # Flyway migrations
   │   └── test/
   ├── Dockerfile
   ├── docker-compose.yml
   └── pom.xml
   ```

4. **Docker Compose Configuration**
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:15-alpine
       environment:
         POSTGRES_DB: goalassist
         POSTGRES_USER: goalassist_user
         POSTGRES_PASSWORD: ${DB_PASSWORD}
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
     
     backend-api:
       build: ./backend-api
       ports:
         - "8082:8082"
       environment:
         SPRING_PROFILES_ACTIVE: dev
         SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/goalassist
       depends_on:
         - postgres
     
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
   
   volumes:
     postgres_data:
   ```

---

### **Phase 1: Database Schema Design & Core Setup** (Weeks 3-4)

#### Objectives:
- Design PostgreSQL schema
- Implement database migrations
- Set up JPA entities

#### 1.1 PostgreSQL Schema Design

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE,  -- For gradual migration
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    photo_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high')),
    urgency VARCHAR(20) CHECK (urgency IN ('low', 'medium', 'high')),
    due_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Tags Table (Many-to-Many with Tasks)
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),  -- Hex color code
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE TABLE task_tags (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- Milestones Table
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    urgency VARCHAR(20) CHECK (urgency IN ('low', 'medium', 'high')),
    status VARCHAR(20) CHECK (status IN ('planned', 'active', 'completed', 'on_hold')),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_user_id ON milestones(user_id);
CREATE INDEX idx_milestones_status ON milestones(status);

-- Time Entries Table
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    task_title_snapshot VARCHAR(500),
    milestone_id_snapshot UUID,
    emoji VARCHAR(10),
    note TEXT,
    source VARCHAR(20) CHECK (source IN ('manual', 'timer')),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_sec INTEGER DEFAULT 0,
    day DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_day ON time_entries(day);
CREATE INDEX idx_time_entries_task_id ON time_entries(task_id);

-- Time Entry Tags (Snapshot)
CREATE TABLE time_entry_tags (
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (time_entry_id, tag_name)
);

-- Satisfaction Logs Table
CREATE TABLE satisfaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);

CREATE INDEX idx_satisfaction_logs_user_date ON satisfaction_logs(user_id, log_date);

-- Standup Logs Table
CREATE TABLE standup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);

-- Standup Completed Items
CREATE TABLE standup_completed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standup_log_id UUID NOT NULL REFERENCES standup_logs(id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    item_order INTEGER DEFAULT 0
);

-- Standup Blockers
CREATE TABLE standup_blockers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standup_log_id UUID NOT NULL REFERENCES standup_logs(id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    item_order INTEGER DEFAULT 0
);

-- Standup Planned Items
CREATE TABLE standup_planned (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standup_log_id UUID NOT NULL REFERENCES standup_logs(id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    item_order INTEGER DEFAULT 0
);

-- Audit Log Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    entity_type VARCHAR(50),
    entity_id UUID,
    action VARCHAR(20) CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
```

#### 1.2 Flyway Migration Scripts

Create migration files in `src/main/resources/db/migration/`:

- `V1__create_users_table.sql`
- `V2__create_tasks_table.sql`
- `V3__create_tags_tables.sql`
- `V4__create_milestones_table.sql`
- `V5__create_time_entries_table.sql`
- `V6__create_satisfaction_logs_table.sql`
- `V7__create_standup_logs_table.sql`
- `V8__create_audit_logs_table.sql`
- `V9__create_indexes.sql`

#### 1.3 JPA Entities

Example: `Task.java`
```java
@Entity
@Table(name = "tasks")
@EntityListeners(AuditingEntityListener.class)
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id")
    private Milestone milestone;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Boolean completed = false;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Urgency urgency;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @ManyToMany
    @JoinTable(
        name = "task_tags",
        joinColumns = @JoinColumn(name = "task_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<Tag> tags = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // Getters, setters, constructors
}
```

---

### **Phase 2: Authentication & Authorization** (Weeks 5-6)

#### Objectives:
- Implement JWT-based authentication
- Migrate from Firebase Auth to custom auth
- Support both systems during transition

#### 2.1 Authentication Strategy

**Option A: Gradual Migration (Recommended)**
1. Continue using Firebase Auth for frontend
2. Backend validates Firebase ID tokens
3. Generate internal JWT for session management
4. Gradually migrate users to native auth

**Option B: Immediate Migration**
1. Export Firebase users
2. Force password resets
3. Switch to Spring Security completely

#### 2.2 Spring Security Configuration

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/api/public/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter(), 
                UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
```

#### 2.3 JWT Service

```java
@Service
public class JwtService {
    @Value("${jwt.secret}")
    private String secret;
    
    @Value("${jwt.expiration}")
    private Long expiration;

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, userDetails.getUsername());
    }

    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
            .setClaims(claims)
            .setSubject(subject)
            .setIssuedAt(new Date(System.currentTimeMillis()))
            .setExpiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(SignatureAlgorithm.HS256, secret)
            .compact();
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    // Additional methods for token extraction, validation, etc.
}
```

---

### **Phase 3: Core API Development - Tasks Module** (Weeks 7-9)

#### Objectives:
- Implement Task CRUD operations
- Build RESTful endpoints
- Add business logic for Eisenhower Matrix

#### 3.1 Task Controller

```java
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {
    
    private final TaskService taskService;

    @GetMapping
    public ResponseEntity<Page<TaskDto>> getTasks(
        @AuthenticationPrincipal UserDetails userDetails,
        @RequestParam(required = false) Boolean completed,
        @RequestParam(required = false) Priority priority,
        @RequestParam(required = false) Urgency urgency,
        @RequestParam(required = false) UUID milestoneId,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) 
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(required = false) 
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
        Pageable pageable
    ) {
        Page<TaskDto> tasks = taskService.getTasks(
            userDetails.getUsername(), completed, priority, urgency, 
            milestoneId, search, startDate, endDate, pageable
        );
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskDto> getTask(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable UUID id
    ) {
        TaskDto task = taskService.getTask(userDetails.getUsername(), id);
        return ResponseEntity.ok(task);
    }

    @PostMapping
    public ResponseEntity<TaskDto> createTask(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody CreateTaskRequest request
    ) {
        TaskDto task = taskService.createTask(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(task);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskDto> updateTask(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable UUID id,
        @Valid @RequestBody UpdateTaskRequest request
    ) {
        TaskDto task = taskService.updateTask(userDetails.getUsername(), id, request);
        return ResponseEntity.ok(task);
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<TaskDto> toggleComplete(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable UUID id
    ) {
        TaskDto task = taskService.toggleComplete(userDetails.getUsername(), id);
        return ResponseEntity.ok(task);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable UUID id
    ) {
        taskService.deleteTask(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/matrix")
    public ResponseEntity<MatrixTasksResponse> getMatrixTasks(
        @AuthenticationPrincipal UserDetails userDetails,
        @RequestParam(required = false) 
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(required = false) 
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        MatrixTasksResponse matrix = taskService.getMatrixTasks(
            userDetails.getUsername(), startDate, endDate
        );
        return ResponseEntity.ok(matrix);
    }
}
```

#### 3.2 Task Service

```java
@Service
@RequiredArgsConstructor
@Transactional
public class TaskService {
    
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TaskMapper taskMapper;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public Page<TaskDto> getTasks(
        String username, Boolean completed, Priority priority, 
        Urgency urgency, UUID milestoneId, String search,
        LocalDate startDate, LocalDate endDate, Pageable pageable
    ) {
        User user = userRepository.findByEmail(username)
            .orElseThrow(() -> new UserNotFoundException(username));
        
        Specification<Task> spec = TaskSpecification.builder()
            .userId(user.getId())
            .completed(completed)
            .priority(priority)
            .urgency(urgency)
            .milestoneId(milestoneId)
            .search(search)
            .startDate(startDate)
            .endDate(endDate)
            .build();
        
        Page<Task> tasks = taskRepository.findAll(spec, pageable);
        return tasks.map(taskMapper::toDto);
    }

    public TaskDto createTask(String username, CreateTaskRequest request) {
        User user = userRepository.findByEmail(username)
            .orElseThrow(() -> new UserNotFoundException(username));
        
        Task task = taskMapper.toEntity(request);
        task.setUser(user);
        
        if (request.getMilestoneId() != null) {
            Milestone milestone = milestoneRepository.findById(request.getMilestoneId())
                .orElseThrow(() -> new MilestoneNotFoundException(request.getMilestoneId()));
            task.setMilestone(milestone);
        }
        
        Task saved = taskRepository.save(task);
        auditService.logCreate(user, "TASK", saved.getId(), saved);
        
        return taskMapper.toDto(saved);
    }

    public MatrixTasksResponse getMatrixTasks(
        String username, LocalDate startDate, LocalDate endDate
    ) {
        User user = userRepository.findByEmail(username)
            .orElseThrow(() -> new UserNotFoundException(username));
        
        List<Task> tasks = taskRepository.findByUserAndDateRange(
            user.getId(), 
            startDate != null ? startDate.atStartOfDay() : null,
            endDate != null ? endDate.atTime(23, 59, 59) : null
        );
        
        MatrixTasksResponse response = new MatrixTasksResponse();
        
        tasks.forEach(task -> {
            TaskDto dto = taskMapper.toDto(task);
            if (task.getPriority() == null || task.getUrgency() == null) {
                response.getUncategorized().add(dto);
            } else if (task.getPriority() == Priority.HIGH && task.getUrgency() == Urgency.HIGH) {
                response.getQ1().add(dto);
            } else if (task.getPriority() == Priority.HIGH && task.getUrgency() != Urgency.HIGH) {
                response.getQ2().add(dto);
            } else if (task.getPriority() != Priority.HIGH && task.getUrgency() == Urgency.HIGH) {
                response.getQ3().add(dto);
            } else {
                response.getQ4().add(dto);
            }
        });
        
        return response;
    }

    // Additional methods for update, delete, etc.
}
```

#### 3.3 Task Repository with Specifications

```java
@Repository
public interface TaskRepository extends JpaRepository<Task, UUID>, 
                                         JpaSpecificationExecutor<Task> {
    
    @Query("SELECT t FROM Task t WHERE t.user.id = :userId " +
           "AND (:startDate IS NULL OR t.dueDate >= :startDate) " +
           "AND (:endDate IS NULL OR t.dueDate <= :endDate)")
    List<Task> findByUserAndDateRange(
        @Param("userId") UUID userId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    @Query("SELECT COUNT(t) FROM Task t WHERE t.user.id = :userId AND t.completed = true")
    Long countCompletedByUser(@Param("userId") UUID userId);
}
```

---

### **Phase 4: Additional Modules** (Weeks 10-14)

Implement remaining modules following the same pattern:

1. **Milestones Module** (Week 10)
   - CRUD operations
   - Progress calculation
   - Task association

2. **Time Tracking Module** (Week 11)
   - Time entry CRUD
   - Timer functionality (WebSocket)
   - Weekly summary calculations

3. **Satisfaction & Standup Logs** (Week 12)
   - Daily log CRUD
   - Analytics endpoints
   - Trend calculations

4. **Analytics & Reporting** (Week 13-14)
   - Aggregated statistics
   - Dashboard data endpoints
   - Export functionality

---

### **Phase 5: Real-Time Features (WebSocket)** (Week 15)

#### Objectives:
- Implement WebSocket for real-time updates
- Replace Firebase real-time listeners

#### 5.1 WebSocket Configuration

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOrigins("http://localhost:3000")
            .withSockJS();
    }
}
```

#### 5.2 Real-Time Task Updates

```java
@Service
@RequiredArgsConstructor
public class TaskNotificationService {
    
    private final SimpMessagingTemplate messagingTemplate;
    
    public void notifyTaskCreated(UUID userId, TaskDto task) {
        messagingTemplate.convertAndSendToUser(
            userId.toString(),
            "/topic/tasks/created",
            task
        );
    }
    
    public void notifyTaskUpdated(UUID userId, TaskDto task) {
        messagingTemplate.convertAndSendToUser(
            userId.toString(),
            "/topic/tasks/updated",
            task
        );
    }
    
    public void notifyTaskDeleted(UUID userId, UUID taskId) {
        messagingTemplate.convertAndSendToUser(
            userId.toString(),
            "/topic/tasks/deleted",
            taskId
        );
    }
}
```

---

## 5. Data Migration Strategy

### 5.1 Migration Approach

**Two-Phase Migration:**

#### Phase 1: Historical Data Migration (One-time)
1. Export all data from Firestore
2. Transform to PostgreSQL format
3. Import into PostgreSQL
4. Verify data integrity

#### Phase 2: Incremental Sync (During transition)
1. Dual-write to both systems
2. Compare and reconcile differences
3. Gradually flip reads to PostgreSQL
4. Decommission Firebase

### 5.2 Migration Tool

Create a Spring Boot batch job for migration:

```java
@Component
@RequiredArgsConstructor
public class FirestoreMigrationJob {
    
    private final FirestoreService firestoreService;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    
    @Scheduled(cron = "0 0 2 * * ?") // Run at 2 AM daily during transition
    public void syncFirestoreToPostgres() {
        log.info("Starting Firestore to PostgreSQL sync...");
        
        // Migrate users first
        List<FirestoreUser> firestoreUsers = firestoreService.getAllUsers();
        firestoreUsers.forEach(this::migrateUser);
        
        // Migrate tasks
        List<FirestoreTask> firestoreTasks = firestoreService.getAllTasks();
        firestoreTasks.forEach(this::migrateTask);
        
        // Migrate other entities...
        
        log.info("Firestore to PostgreSQL sync completed.");
    }
    
    private void migrateUser(FirestoreUser firestoreUser) {
        User user = userRepository.findByFirebaseUid(firestoreUser.getUid())
            .orElse(new User());
        
        user.setFirebaseUid(firestoreUser.getUid());
        user.setEmail(firestoreUser.getEmail());
        user.setDisplayName(firestoreUser.getDisplayName());
        user.setPhotoUrl(firestoreUser.getPhotoUrl());
        
        userRepository.save(user);
    }
    
    private void migrateTask(FirestoreTask firestoreTask) {
        // Map Firestore task to PostgreSQL task
        // Handle conversions, validations, etc.
    }
}
```

### 5.3 Data Validation

```java
@Service
public class DataValidationService {
    
    public ValidationReport validateMigration() {
        ValidationReport report = new ValidationReport();
        
        // Compare counts
        long firestoreTaskCount = firestoreService.getTaskCount();
        long postgresTaskCount = taskRepository.count();
        report.addCheck("Task Count", firestoreTaskCount == postgresTaskCount);
        
        // Sample validation
        List<Task> sampleTasks = taskRepository.findRandomSample(100);
        sampleTasks.forEach(task -> {
            FirestoreTask firestoreTask = firestoreService.getTask(task.getId());
            boolean matches = validateTaskMatch(task, firestoreTask);
            report.addCheck("Task " + task.getId(), matches);
        });
        
        return report;
    }
}
```

---

## 6. API Design

### 6.1 REST API Principles

- **RESTful conventions**: Use HTTP verbs correctly
- **Resource-based URLs**: `/api/tasks`, `/api/milestones`
- **Versioning**: `/api/v1/tasks`
- **Pagination**: Use `page`, `size`, `sort` parameters
- **Filtering**: Query parameters for filters
- **HATEOAS**: Consider adding links for discoverability

### 6.2 API Endpoints Summary

```
# Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

# Tasks
GET    /api/v1/tasks              # List with filters
POST   /api/v1/tasks              # Create
GET    /api/v1/tasks/{id}         # Get by ID
PUT    /api/v1/tasks/{id}         # Full update
PATCH  /api/v1/tasks/{id}         # Partial update
DELETE /api/v1/tasks/{id}         # Delete
PATCH  /api/v1/tasks/{id}/complete # Toggle completion
GET    /api/v1/tasks/matrix       # Eisenhower Matrix view

# Milestones
GET    /api/v1/milestones
POST   /api/v1/milestones
GET    /api/v1/milestones/{id}
PUT    /api/v1/milestones/{id}
DELETE /api/v1/milestones/{id}
GET    /api/v1/milestones/{id}/tasks

# Time Entries
GET    /api/v1/time-entries
POST   /api/v1/time-entries
GET    /api/v1/time-entries/{id}
PUT    /api/v1/time-entries/{id}
DELETE /api/v1/time-entries/{id}
POST   /api/v1/time-entries/timer/start
POST   /api/v1/time-entries/timer/stop
GET    /api/v1/time-entries/week/{date}

# Satisfaction Logs
GET    /api/v1/satisfaction
POST   /api/v1/satisfaction
GET    /api/v1/satisfaction/{date}
PUT    /api/v1/satisfaction/{date}
DELETE /api/v1/satisfaction/{date}

# Standup Logs
GET    /api/v1/standup
POST   /api/v1/standup
GET    /api/v1/standup/{date}
PUT    /api/v1/standup/{date}
DELETE /api/v1/standup/{date}

# Analytics
GET    /api/v1/analytics/dashboard
GET    /api/v1/analytics/task-summary
GET    /api/v1/analytics/time-summary
GET    /api/v1/analytics/satisfaction-trend
```

### 6.3 Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Task created successfully",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

Error Response:
```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task with ID xyz not found",
    "details": []
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 7. Authentication & Authorization

### 7.1 JWT Token Structure

```json
{
  "sub": "user@example.com",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "roles": ["USER"],
  "iat": 1609459200,
  "exp": 1609545600
}
```

### 7.2 Role-Based Access Control (Future)

```java
@PreAuthorize("hasRole('USER')")
public TaskDto getTask(String username, UUID id) { ... }

@PreAuthorize("hasRole('ADMIN')")
public void deleteAllTasks() { ... }
```

---

## 8. Deployment Strategy

### 8.1 Infrastructure Setup

**Development Environment:**
- Local Docker Compose
- PostgreSQL container
- Spring Boot running locally
- Next.js dev server

**Staging Environment:**
- AWS EC2 / Google Cloud Compute
- RDS PostgreSQL
- Docker containers
- CI/CD deployment

**Production Environment:**
- Kubernetes cluster (EKS/GKE)
- Managed PostgreSQL (RDS/Cloud SQL)
- Load balancer
- Auto-scaling

### 8.2 Kubernetes Deployment

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: goalassist-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: goalassist-backend
  template:
    metadata:
      labels:
        app: goalassist-backend
    spec:
      containers:
      - name: backend
        image: goalassist/backend:latest
        ports:
        - containerPort: 8082
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "prod"
        - name: SPRING_DATASOURCE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: SPRING_DATASOURCE_USERNAME
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: username
        - name: SPRING_DATASOURCE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8082
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8082
          initialDelaySeconds: 20
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: goalassist-backend-service
spec:
  selector:
    app: goalassist-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8082
  type: LoadBalancer
```

### 8.3 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/backend-deploy.yml
name: Backend CI/CD

on:
  push:
    branches: [ main ]
    paths:
      - 'backend-api/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Build with Maven
      working-directory: ./backend-api
      run: mvn clean package -DskipTests
    
    - name: Run tests
      working-directory: ./backend-api
      run: mvn test
    
    - name: Build Docker image
      working-directory: ./backend-api
      run: docker build -t goalassist/backend:${{ github.sha }} .
    
    - name: Push to Docker Hub
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker push goalassist/backend:${{ github.sha }}
        docker tag goalassist/backend:${{ github.sha }} goalassist/backend:latest
        docker push goalassist/backend:latest
    
    - name: Deploy to Kubernetes
      uses: azure/k8s-deploy@v1
      with:
        manifests: |
          k8s/backend-deployment.yaml
        images: |
          goalassist/backend:${{ github.sha }}
```

---

## 9. Testing Strategy

### 9.1 Test Pyramid

```
         /\
        /  \    E2E Tests (5%)
       /____\
      /      \
     /        \  Integration Tests (20%)
    /__________\
   /            \
  /              \ Unit Tests (75%)
 /________________\
```

### 9.2 Unit Tests

```java
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {
    
    @Mock
    private TaskRepository taskRepository;
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private TaskMapper taskMapper;
    
    @InjectMocks
    private TaskService taskService;
    
    @Test
    void createTask_Success() {
        // Given
        String username = "test@example.com";
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("Test Task");
        
        User user = new User();
        user.setEmail(username);
        
        Task task = new Task();
        task.setTitle("Test Task");
        
        when(userRepository.findByEmail(username)).thenReturn(Optional.of(user));
        when(taskMapper.toEntity(request)).thenReturn(task);
        when(taskRepository.save(any(Task.class))).thenReturn(task);
        when(taskMapper.toDto(task)).thenReturn(new TaskDto());
        
        // When
        TaskDto result = taskService.createTask(username, request);
        
        // Then
        assertNotNull(result);
        verify(taskRepository).save(task);
    }
}
```

### 9.3 Integration Tests

```java
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TaskControllerIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private TaskRepository taskRepository;
    
    @Test
    @WithMockUser(username = "test@example.com")
    void createTask_Integration() throws Exception {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("Integration Test Task");
        
        mockMvc.perform(post("/api/v1/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.title").value("Integration Test Task"));
    }
}
```

### 9.4 E2E Tests (Postman/Newman)

Create Postman collections for API testing:
- Authentication flow
- CRUD operations for each entity
- Error scenarios
- Performance tests

---

## 10. Rollback Plan

### 10.1 Rollback Triggers

- Critical bugs in production
- Data inconsistency > 1%
- Performance degradation > 50%
- Unrecoverable errors

### 10.2 Rollback Steps

1. **Immediate Actions:**
   - Switch feature flag to route traffic back to Firebase
   - Stop dual-write process
   - Alert team

2. **Data Reconciliation:**
   - Compare Firebase and PostgreSQL data
   - Identify discrepancies
   - Manual reconciliation if needed

3. **Investigation:**
   - Analyze logs
   - Identify root cause
   - Plan fix

4. **Re-attempt Migration:**
   - Fix issues
   - Test thoroughly in staging
   - Gradual rollout with monitoring

---

## 11. Timeline & Resource Allocation

### 11.1 Gantt Chart Overview

```
Week  1-2  | Phase 0: Setup                    | DevOps + Backend Lead
Week  3-4  | Phase 1: Database Design          | Backend Lead + DBA
Week  5-6  | Phase 2: Authentication           | Backend + Security
Week  7-9  | Phase 3: Tasks Module             | Backend (2 devs)
Week 10    | Phase 4.1: Milestones             | Backend
Week 11    | Phase 4.2: Time Tracking          | Backend
Week 12    | Phase 4.3: Logs                   | Backend
Week 13-14 | Phase 4.4: Analytics              | Backend + Frontend
Week 15    | Phase 5: WebSocket                | Backend + Frontend
Week 16-17 | Data Migration                    | All hands
Week 18-19 | Testing & Bug Fixes               | QA + Backend
Week 20    | Staged Rollout                    | All
Week 21-22 | Monitoring & Optimization         | DevOps + Backend
Week 23-24 | Decommission Firebase (Buffer)    | All
```

### 11.2 Team Requirements

- **1 Backend Lead** (Java/Spring Boot expert)
- **2 Backend Developers** (Java experience)
- **1 DevOps Engineer** (Docker, K8s, CI/CD)
- **1 DBA** (PostgreSQL expert)
- **1 Frontend Developer** (for API integration)
- **1 QA Engineer** (testing)
- **1 Project Manager** (optional)

---

## 12. Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Data loss during migration | Low | Critical | - Dual-write strategy<br>- Comprehensive backups<br>- Validation scripts<br>- Staged rollout |
| Performance degradation | Medium | High | - Load testing before launch<br>- Database indexing<br>- Caching layer (Redis)<br>- Query optimization |
| Authentication issues | Medium | Critical | - Maintain Firebase Auth during transition<br>- Extensive testing<br>- Gradual user migration |
| Downtime during cutover | Medium | High | - Blue-green deployment<br>- Feature flags<br>- Rollback plan ready |
| Timeline delays | High | Medium | - Buffer time in schedule<br>- Regular sprint reviews<br>- Flexible scope prioritization |
| Team skill gaps | Medium | Medium | - Training sessions<br>- Pair programming<br>- External consultants if needed |
| Cost overruns | Medium | Medium | - Regular budget reviews<br>- Cloud cost monitoring<br>- Optimize infrastructure |

---

## 13. Monitoring & Observability

### 13.1 Metrics to Track

**Application Metrics:**
- Request latency (p50, p95, p99)
- Error rate
- Throughput (requests/sec)
- Database connection pool usage

**Business Metrics:**
- Daily active users
- Task creation rate
- API usage per endpoint

### 13.2 Tools

- **Prometheus**: Metrics collection
- **Grafana**: Dashboards
- **ELK Stack**: Centralized logging
- **Sentry**: Error tracking
- **New Relic / Datadog**: APM (optional)

### 13.3 Alerts

```yaml
# Example Prometheus alert rules
groups:
  - name: goalassist_backend
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
      
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
        for: 5m
        annotations:
          summary: "95th percentile latency > 1s"
      
      - alert: DatabaseConnectionPoolExhausted
        expr: hikaricp_connections_active / hikaricp_connections_max > 0.9
        for: 2m
        annotations:
          summary: "Database connection pool usage > 90%"
```

---

## 14. Post-Migration Checklist

- [ ] All data migrated and validated
- [ ] All API endpoints functional
- [ ] Frontend integrated with new backend
- [ ] Authentication working correctly
- [ ] Real-time features (WebSocket) operational
- [ ] Performance benchmarks met
- [ ] Monitoring and alerts configured
- [ ] Documentation updated
- [ ] Team trained on new architecture
- [ ] Firebase resources decommissioned
- [ ] Cost analysis completed
- [ ] Post-mortem conducted

---

## 15. Appendices

### Appendix A: Recommended Dependencies (pom.xml)

```xml
<dependencies>
    <!-- Spring Boot Starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-websocket</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <!-- Database -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-core</artifactId>
    </dependency>

    <!-- Security -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.11.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>

    <!-- Utilities -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct</artifactId>
        <version>1.5.5.Final</version>
    </dependency>

    <!-- Monitoring -->
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-registry-prometheus</artifactId>
    </dependency>

    <!-- Testing -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.springframework.security</groupId>
        <artifactId>spring-security-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### Appendix B: application.yml Template

```yaml
spring:
  application:
    name: goalassist-backend
  
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/goalassist}
    username: ${DATABASE_USERNAME:goalassist_user}
    password: ${DATABASE_PASSWORD:password}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 20000
  
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.PostgreSQLDialect
  
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
  
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${JWT_ISSUER_URI:http://localhost:8082}

jwt:
  secret: ${JWT_SECRET:your-secret-key-change-in-production}
  expiration: ${JWT_EXPIRATION:86400000}  # 24 hours

server:
  port: 8082
  error:
    include-message: always
    include-binding-errors: always

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true

logging:
  level:
    com.goalassist: DEBUG
    org.springframework.web: INFO
    org.hibernate.SQL: DEBUG
```

---

## Conclusion

This migration plan provides a comprehensive roadmap for transitioning from Firebase to a Java Spring Boot + PostgreSQL architecture. The phased approach minimizes risk, ensures data integrity, and allows for iterative improvements. Regular monitoring, testing, and team communication will be crucial for success.

**Key Success Factors:**
1. Start small, test thoroughly
2. Maintain dual-write during transition
3. Monitor metrics closely
4. Have a robust rollback plan
5. Communicate progress regularly

**Estimated Total Duration:** 24 weeks (6 months)

**Estimated Team Size:** 6-8 people

**Estimated Cost:** $150,000 - $250,000 (salaries + infrastructure)

---

**Document Version:** 1.0  
**Last Updated:** November 22, 2025  
**Author:** AI Assistant  
**Status:** Draft - Awaiting Review

