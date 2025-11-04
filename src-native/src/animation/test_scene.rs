use bevy::prelude::*;
use super::{
    core::{AnimationPlayer, Skeleton},
    examples::HumanoidAnimations,
    state_machine::{AnimationStateMachine, AnimationState, Transition},
};

pub struct TestScenePlugin;

impl Plugin for TestScenePlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, setup_test_scene)
           .add_systems(Update, (
               handle_input,
               update_debug_text,
           ));
    }
}

#[derive(Component)]
struct TestCharacter;

#[derive(Component)]
struct DebugText;

fn setup_test_scene(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    mut animations: ResMut<Assets<AnimationClip>>,
) {
    // Camera
    commands.spawn(Camera3dBundle {
        transform: Transform::from_xyz(-2.0, 2.0, 5.0).looking_at(Vec3::ZERO, Vec3::Y),
        ..default()
    });

    // Light
    commands.spawn(DirectionalLightBundle {
        transform: Transform::from_xyz(3.0, 8.0, 5.0).looking_at(Vec3::ZERO, Vec3::Y),
        directional_light: DirectionalLight {
            shadows_enabled: true,
            ..default()
        },
        ..default()
    });

    // Ground plane
    commands.spawn(PbrBundle {
        mesh: meshes.add(shape::Plane::from_size(10.0).into()),
        material: materials.add(Color::rgb(0.3, 0.5, 0.3).into()),
        transform: Transform::from_xyz(0.0, -0.5, 0.0),
        ..default()
    });

    // Create test character
    let animations = create_humanoid_animations(&asset_server, animations);
    let mut state_machine = AnimationStateMachine::new();
    
    // Add states
    state_machine.add_state(AnimationState::new("Idle", animations.idle.clone()));
    state_machine.add_state(AnimationState::new("Walk", animations.walk.clone()));
    state_machine.add_state(AnimationState::new("Run", animations.run.clone()));
    state_machine.add_state(AnimationState::new("Jump", animations.jump.clone()));

    // Add transitions
    state_machine.add_transition(Transition::new("Idle", "Walk"));
    state_machine.add_transition(Transition::new("Walk", "Idle"));
    state_machine.add_transition(Transition::new("Walk", "Run"));
    state_machine.add_transition(Transition::new("Run", "Walk"));
    state_machine.add_transition(Transition::new("Idle", "Jump"));
    state_machine.add_transition(Transition::new("Walk", "Jump"));
    state_machine.add_transition(Transition::new("Run", "Jump"));
    state_machine.add_transition(Transition::new("Jump", "Idle"));

    // Create character entity
    commands.spawn((
        TestCharacter,
        Skeleton::new(),
        AnimationPlayer::new(),
        state_machine,
        // Simplified mesh for testing
        PbrBundle {
            mesh: meshes.add(shape::Capsule::default().into()),
            material: materials.add(Color::rgb(0.8, 0.7, 0.6).into()),
            transform: Transform::from_xyz(0.0, 0.0, 0.0),
            ..default()
        },
    ));

    // Debug UI
    commands.spawn((
        TextBundle::from_section(
            "Current State: Idle",
            TextStyle {
                font_size: 30.0,
                color: Color::WHITE,
                ..default()
            },
        ).with_style(Style {
            position_type: PositionType::Absolute,
            top: Val::Px(10.0),
            left: Val::Px(10.0),
            ..default()
        }),
        DebugText,
    ));
}

fn handle_input(
    keyboard: Res<Input<KeyCode>>,
    mut query: Query<&mut AnimationStateMachine, With<TestCharacter>>,
) {
    let mut state_machine = query.single_mut();
    
    if keyboard.just_pressed(KeyCode::W) {
        state_machine.try_transition_to("Walk");
    }
    if keyboard.just_pressed(KeyCode::ShiftLeft) && state_machine.current_state() == "Walk" {
        state_machine.try_transition_to("Run");
    }
    if keyboard.just_released(KeyCode::ShiftLeft) && state_machine.current_state() == "Run" {
        state_machine.try_transition_to("Walk");
    }
    if keyboard.just_released(KeyCode::W) {
        state_machine.try_transition_to("Idle");
    }
    if keyboard.just_pressed(KeyCode::Space) {
        state_machine.try_transition_to("Jump");
    }
}

fn update_debug_text(
    query: Query<&AnimationStateMachine, With<TestCharacter>>,
    mut text_query: Query<&mut Text, With<DebugText>>,
) {
    let state_machine = query.single();
    let mut text = text_query.single_mut();
    text.sections[0].value = format!("Current State: {}", state_machine.current_state());
}