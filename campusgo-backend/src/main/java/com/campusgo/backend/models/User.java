package com.campusgo.backend.models;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Getter(AccessLevel.NONE)
    private String phone;

    public String getPhone() {
        return this.phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    @com.fasterxml.jackson.annotation.JsonGetter("phone")
    public String getPhoneForJson() {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof com.campusgo.backend.security.UserDetailsImpl userDetails) {
                if (this.getId() != null && (this.getId().equals(userDetails.getId())
                        || userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                                || a.getAuthority().equals("ROLE_MANAGER")
                                || a.getAuthority().equals("ROLE_STORE_STAFF")
                                || a.getAuthority().equals("ROLE_CANTEEN_MEMBER")))) {
                    return this.phone;
                }
            }
        } catch (Exception ignored) {
        }
        return "Hidden";
    }

    @JsonIgnore
    @Column(name = "role")
    private String legacyRole;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    public Set<Role> getRoles() {
        if ((roles == null || roles.isEmpty()) && legacyRole != null) {
            roles = new HashSet<>();
            roles.add(mapLegacyRole(legacyRole));
        }
        if (roles == null) {
            roles = new HashSet<>();
        }
        return roles;
    }

    public void setRoles(Set<Role> roles) {
        this.roles = roles != null ? roles : new HashSet<>();
        this.legacyRole = this.roles.stream().findFirst().map(Role::name).orElse(Role.STUDENT.name());
    }

    public boolean hasRole(Role role) {
        return getRoles().contains(role);
    }

    public void addRole(Role role) {
        getRoles().add(role);
        legacyRole = getPrimaryRole().name();
    }

    public void removeRole(Role role) {
        getRoles().remove(role);
        legacyRole = getPrimaryRole().name();
    }

    /**
     * Kept as a read-only compatibility field for older frontend code while roles is
     * the source of truth.
     */
    @Transient
    public Role getRole() {
        return getPrimaryRole();
    }

    public void setRole(Role role) {
        getRoles().clear();
        getRoles().add(role);
        legacyRole = role.name();
    }

    private Role getPrimaryRole() {
        Set<Role> currentRoles = getRoles();
        if (currentRoles.contains(Role.ADMIN)) {
            return Role.ADMIN;
        }
        if (currentRoles.contains(Role.MANAGER)) {
            return Role.MANAGER;
        }
        if (currentRoles.contains(Role.STORE_STAFF)) {
            return Role.STORE_STAFF;
        }
        if (currentRoles.contains(Role.CANTEEN_MEMBER)) {
            return Role.CANTEEN_MEMBER;
        }
        if (currentRoles.contains(Role.DELIVERY_PARTNER)) {
            return Role.DELIVERY_PARTNER;
        }
        return Role.STUDENT;
    }

    private Role mapLegacyRole(String roleName) {
        if ("MANAGER".equals(roleName)) {
            return Role.MANAGER;
        }
        if ("DELIVERY_AGENT".equals(roleName)) {
            return Role.DELIVERY_PARTNER;
        }
        if ("CANTEEN_MEMBER".equals(roleName)) {
            return Role.STORE_STAFF;
        }
        return Role.valueOf(roleName);
    }
}
