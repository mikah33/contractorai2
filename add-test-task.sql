-- First, get a project ID
DO $$
DECLARE
    project_id UUID;
BEGIN
    -- Get the first project ID
    SELECT id INTO project_id FROM projects LIMIT 1;
    
    IF project_id IS NOT NULL THEN
        -- Insert a test task
        INSERT INTO tasks (
            id,
            title,
            description,
            status,
            priority,
            assignee,
            due_date,
            project_id,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'Test Task - Click Me to Expand',
            'This is a test task. Try clicking the Mark Complete button to see it update!',
            'in-progress',
            'high',
            'John Doe',
            CURRENT_DATE + INTERVAL '7 days',
            project_id,
            NOW()
        );
        
        -- Insert another test task
        INSERT INTO tasks (
            id,
            title,
            description,
            status,
            priority,
            assignee,
            due_date,
            project_id,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'Fix Button Functionality',
            'Make sure all buttons work properly with visual feedback',
            'todo',
            'medium',
            'Jane Smith',
            CURRENT_DATE + INTERVAL '3 days',
            project_id,
            NOW()
        );
        
        RAISE NOTICE 'Test tasks added successfully to project %', project_id;
    ELSE
        RAISE NOTICE 'No projects found. Please create a project first.';
    END IF;
END $$;

SELECT t.*, p.name as project_name 
FROM tasks t 
JOIN projects p ON t.project_id = p.id 
ORDER BY t.created_at DESC 
LIMIT 5;
